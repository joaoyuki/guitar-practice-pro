import { DetectorEnergia } from './detectorEnergia';
import { DetectorMeyda } from './detectorMeyda';
import { DetectorSpectralFlux } from './detectorSpectralFlux';
import type { DetectorBlocos, ParametrosDetector, TipoDetector } from './tipos';

/** Cria o detector baseado em blocos de amostras. O limiar fixo não entra aqui porque roda via requestAnimationFrame. */
export function criarDetectorBlocos(
  tipo: Exclude<TipoDetector, 'limiar-fixo'>,
  parametros: ParametrosDetector,
): DetectorBlocos {
  switch (tipo) {
    case 'energia':
      return new DetectorEnergia(parametros);
    case 'spectral-flux':
      return new DetectorSpectralFlux(parametros);
    case 'meyda':
      return new DetectorMeyda(parametros);
  }
}
