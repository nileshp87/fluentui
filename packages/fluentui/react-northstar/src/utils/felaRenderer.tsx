import { Renderer, RendererParam } from '@fluentui/react-bindings';
import { createRenderer as createFelaRenderer, IStyle } from 'fela';
import felaPluginEmbedded from 'fela-plugin-embedded';
import felaPluginFallbackValue from 'fela-plugin-fallback-value';
import felaPluginPlaceholderPrefixer from 'fela-plugin-placeholder-prefixer';
import felaPluginRtl from 'fela-plugin-rtl';
import * as React from 'react';
import { RendererProvider } from 'react-fela';

import felaDisableAnimationsPlugin from './felaDisableAnimationsPlugin';
import felaExpandCssShorthandsPlugin from './felaExpandCssShorthandsPlugin';
import felaFocusVisibleEnhancer from './felaFocusVisibleEnhancer';
import felaInvokeKeyframesPlugin from './felaInvokeKeyframesPlugin';
import felaPerformanceEnhancer from './felaPerformanceEnhancer';
import felaSanitizeCss from './felaSanitizeCssPlugin';
import felaStylisEnhancer from './felaStylisEnhancer';
import { createEmotionRenderer } from 'src/utils/emotionRender';

let felaDevMode = false;

try {
  // eslint-disable-next-line no-undef
  felaDevMode = !!window.localStorage.felaDevMode;
} catch {}

if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
  if (felaDevMode) {
    /* eslint-disable-next-line no-console */
    console.warn(
      [
        '@fluentui/react-northstar:',
        'You are running Fela in development mode and this can cause performance degrades.',
        'To disable it please paste `delete window.localStorage.felaDevMode` to your browsers console and reload current page.',
      ].join(' '),
    );
  } else {
    /* eslint-disable-next-line no-console */
    console.warn(
      [
        '@fluentui/react-northstar:',
        'You are running Fela in production mode.',
        'This limits your ability to edit styles in browsers development tools.',
        'To enable development mode please paste `window.localStorage.felaDevMode = true` to your browsers console and reload the page.',
      ].join(' '),
    );
  }
}

// Blacklist contains a list of classNames that are used by FontAwesome
// https://fontawesome.com/how-to-use/on-the-web/referencing-icons/basic-use
const blacklistedClassNames = ['fa', 'fas', 'far', 'fal', 'fab'];

const filterClassName = (className: string): boolean =>
  className.indexOf('ad') === -1 && blacklistedClassNames.indexOf(className) === -1;

const rendererConfig = {
  devMode: felaDevMode,
  filterClassName,
  enhancers: [felaPerformanceEnhancer, felaFocusVisibleEnhancer, felaStylisEnhancer],
  plugins: [
    felaDisableAnimationsPlugin(),

    // is necessary to prevent accidental style typos
    // from breaking ALL the styles on the page
    felaSanitizeCss({
      skip: ['content', 'keyframe'],
    }),

    felaPluginPlaceholderPrefixer(),
    felaInvokeKeyframesPlugin(),
    felaPluginEmbedded(),

    felaExpandCssShorthandsPlugin(),

    // Heads up!
    // This is required after fela-plugin-prefixer to resolve the array of fallback values prefixer produces.
    felaPluginFallbackValue(),

    felaPluginRtl(),
  ],
};

type FelaRendererParam = Omit<RendererParam, 'RendererParam'> & { theme: { direction: 'rtl' | 'ltr' } };

export const createRenderer = (target: Document): Renderer => {
  const felaRenderer = createFelaRenderer(rendererConfig);

  // rehydration disabled to avoid leaking styles between renderers
  // https://github.com/rofrischmann/fela/blob/master/docs/api/fela-dom/rehydrate.md
  const Provider: React.FC = props => (
    <RendererProvider renderer={felaRenderer} {...{ rehydrate: false, targetDocument: target }}>
      {props.children}
    </RendererProvider>
  );

  return {
    renderFont: font => {
      felaRenderer.renderFont(font.name, font.paths, font.props);
    },
    renderGlobal: felaRenderer.renderStatic,
    renderRule: (styles, param) => {
      const felaParam: FelaRendererParam = {
        ...param,
        theme: { direction: param.direction },
      };

      return felaRenderer.renderRule(() => (styles as unknown) as IStyle, felaParam);
    },

    Provider,
  };
};

export const felaRenderer = createEmotionRenderer(document); // createRenderer(document);
