import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { iniciarCaptura, listarMicrofones, type CapturaMicrofone } from './captura';
import type { ConfiguracaoMicrofone } from './configuracao';
import { criarDetectorBlocos } from './criarDetector';
import { DetectorLimiarFixo } from './detectorLimiarFixo';

export type EstadoMicrofone = 'inativo' | 'iniciando' | 'ativo' | 'erro';

export interface ToqueMicrofone {
  /** Tempo do toque em `performance.now()`, já descontada a compensação da calibração. */
  perfMs: number;
  /** Tempo sem compensação, usado pela própria calibração. */
  perfBrutoMs: number;
}

/** Dados recentes para o monitor visual. Fica num ref (e não em estado) porque muda centenas de vezes por segundo. */
export interface DadosMonitor {
  curva: { perfMs: number; valor: number; limiar: number }[];
  toques: number[];
  nivelDb: number;
  saturou: boolean;
}

const HISTORICO_MONITOR_MS = 5000;
const DECAIMENTO_NIVEL_DB = 1.5;

function mensagemDeErro(erro: unknown): string {
  if (erro instanceof DOMException) {
    if (erro.name === 'NotAllowedError') return 'Permissão do microfone negada. Libere o acesso nas configurações do navegador.';
    if (erro.name === 'NotFoundError' || erro.name === 'OverconstrainedError') return 'Nenhum microfone encontrado.';
    if (erro.name === 'NotReadableError') return 'O microfone está sendo usado por outro aplicativo.';
  }
  return `Não foi possível abrir o microfone: ${erro instanceof Error ? erro.message : String(erro)}`;
}

function removerAntigos<T>(lista: T[], tempo: (item: T) => number, limite: number): void {
  while (lista.length > 0 && tempo(lista[0]) < limite) lista.shift();
}

export function useMicrofone(configuracao: ConfiguracaoMicrofone) {
  const [estado, setEstado] = useState<EstadoMicrofone>('inativo');
  const [erro, setErro] = useState<string | null>(null);
  const [dispositivos, setDispositivos] = useState<MediaDeviceInfo[]>([]);
  const [rotuloDispositivo, setRotuloDispositivo] = useState('');
  const [totalToques, setTotalToques] = useState(0);

  const capturaRef = useRef<CapturaMicrofone | null>(null);
  const ouvintesRef = useRef(new Set<(toque: ToqueMicrofone) => void>());
  const monitorRef = useRef<DadosMonitor>({ curva: [], toques: [], nivelDb: -100, saturou: false });
  const compensacaoRef = useRef(0);

  const { tipo, intervaloMinimoMs } = configuracao;
  const { sensibilidade, compensacaoMs } = configuracao.porDetector[tipo];

  useEffect(() => {
    compensacaoRef.current = compensacaoMs;
  }, [compensacaoMs]);

  const emitirToque = useCallback((perfBrutoMs: number) => {
    const toque = { perfBrutoMs, perfMs: perfBrutoMs - compensacaoRef.current };
    const monitor = monitorRef.current;
    monitor.toques.push(perfBrutoMs);
    removerAntigos(monitor.toques, (t) => t, perfBrutoMs - HISTORICO_MONITOR_MS);
    ouvintesRef.current.forEach((ouvinte) => ouvinte(toque));
    setTotalToques((total) => total + 1);
  }, []);

  const registrarCurva = useCallback((perfMs: number, valor: number, limiar: number) => {
    const curva = monitorRef.current.curva;
    curva.push({ perfMs, valor, limiar });
    removerAntigos(curva, (p) => p.perfMs, perfMs - HISTORICO_MONITOR_MS);
  }, []);

  // (Re)cria o detector quando o tipo ou os parâmetros mudam, sem precisar reabrir o microfone.
  useEffect(() => {
    const captura = capturaRef.current;
    if (estado !== 'ativo' || !captura) return;
    monitorRef.current.curva = [];
    monitorRef.current.toques = [];

    const detectorBlocos =
      tipo === 'limiar-fixo'
        ? null
        : criarDetectorBlocos(tipo, { sampleRate: captura.ctx.sampleRate, sensibilidade, intervaloMinimoMs });
    let proximoFrame = -1;

    captura.aoReceberPacote(({ frame, amostras }) => {
      const monitor = monitorRef.current;
      let pico = 0;
      for (let i = 0; i < amostras.length; i++) pico = Math.max(pico, Math.abs(amostras[i]));
      const picoDb = 20 * Math.log10(pico + 1e-9);
      monitor.nivelDb = Math.max(picoDb, monitor.nivelDb - DECAIMENTO_NIVEL_DB);
      if (pico >= 0.99) monitor.saturou = true;

      if (!detectorBlocos) return;
      if (frame !== proximoFrame) detectorBlocos.reiniciar();
      proximoFrame = frame + amostras.length;

      const { onsets, diagnostico } = detectorBlocos.processar(amostras, frame);
      for (const ponto of diagnostico) registrarCurva(captura.frameParaPerfMs(ponto.frame), ponto.valor, ponto.limiar);
      for (const onset of onsets) emitirToque(captura.frameParaPerfMs(onset));
    });

    let quadro = 0;
    if (tipo === 'limiar-fixo') {
      const detector = new DetectorLimiarFixo(sensibilidade, intervaloMinimoMs);
      const amostras = new Float32Array(captura.analyser.fftSize);
      const aoQuadro = () => {
        captura.analyser.getFloatTimeDomainData(amostras);
        let soma = 0;
        for (let i = 0; i < amostras.length; i++) soma += amostras[i] * amostras[i];
        const nivelDb = 10 * Math.log10(soma / amostras.length + 1e-12);
        const agora = performance.now();
        registrarCurva(agora, nivelDb, detector.limiarDb);
        if (detector.avaliar(nivelDb, agora)) emitirToque(agora);
        quadro = requestAnimationFrame(aoQuadro);
      };
      quadro = requestAnimationFrame(aoQuadro);
    }

    return () => {
      cancelAnimationFrame(quadro);
      captura.aoReceberPacote(() => {});
    };
  }, [estado, tipo, sensibilidade, intervaloMinimoMs, emitirToque, registrarCurva]);

  const parar = useCallback(async () => {
    const captura = capturaRef.current;
    capturaRef.current = null;
    setEstado('inativo');
    if (captura) await captura.parar();
  }, []);

  const iniciar = useCallback(
    async (deviceId: string | null) => {
      if (capturaRef.current) await parar();
      setEstado('iniciando');
      setErro(null);
      try {
        const captura = await iniciarCaptura(deviceId);
        capturaRef.current = captura;
        monitorRef.current = { curva: [], toques: [], nivelDb: -100, saturou: false };
        setRotuloDispositivo(captura.rotuloDispositivo);
        setTotalToques(0);
        setEstado('ativo');
        // Os nomes dos dispositivos só aparecem depois que a permissão foi concedida.
        setDispositivos(await listarMicrofones());
      } catch (e) {
        setErro(mensagemDeErro(e));
        setEstado('erro');
      }
    },
    [parar],
  );

  useEffect(() => {
    return () => {
      void capturaRef.current?.parar();
      capturaRef.current = null;
    };
  }, []);

  const assinar = useCallback((ouvinte: (toque: ToqueMicrofone) => void) => {
    ouvintesRef.current.add(ouvinte);
    return () => {
      ouvintesRef.current.delete(ouvinte);
    };
  }, []);

  const obterCaptura = useCallback(() => capturaRef.current, []);
  const limparSaturacao = useCallback(() => {
    monitorRef.current.saturou = false;
  }, []);

  return useMemo(
    () => ({
      estado,
      erro,
      dispositivos,
      rotuloDispositivo,
      totalToques,
      monitorRef,
      iniciar,
      parar,
      assinar,
      obterCaptura,
      limparSaturacao,
    }),
    [estado, erro, dispositivos, rotuloDispositivo, totalToques, iniciar, parar, assinar, obterCaptura, limparSaturacao],
  );
}

export type Microfone = ReturnType<typeof useMicrofone>;
