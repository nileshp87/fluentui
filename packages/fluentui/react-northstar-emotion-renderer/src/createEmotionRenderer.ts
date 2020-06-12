import createCache from '@emotion/cache';
import { serializeStyles } from '@emotion/serialize';
import { StyleSheet } from '@emotion/sheet';
import { EmotionCache, insertStyles } from '@emotion/utils';
import { Renderer, RendererRenderRule } from '@fluentui/styles';
import focusVisiblePlugin from '@quid/stylis-plugin-focus-visible';
import rtlPlugin from 'stylis-plugin-rtl';
import * as React from 'react';

import { invokeKeyframes } from './invokeKeyframes';
import { generateFontSource, getFontLocals, toCSSString } from './utils';
import { disableAnimations } from './disableAnimations';

export function createEmotionRenderer(target?: Document): Renderer {
  const cacheLtr = createCache({
    container: target?.head,
    key: 'fui',
    stylisPlugins: [focusVisiblePlugin],
  }) as EmotionCache & { insert: Function };
  const cacheRtl = createCache({
    container: target?.head,
    key: 'rfui',
    stylisPlugins: [focusVisiblePlugin, rtlPlugin],
  });

  const sheet = new StyleSheet({
    key: `${cacheLtr.key}-global`,
    nonce: cacheLtr.sheet.nonce,
    container: cacheLtr.sheet.container,
  });

  const Provider: React.FC = props => {
    // TODO: Find a way to cleanup global styles
    // React.useEffect(() => {
    // return () => sheet.flush();
    // });

    return React.createElement(React.Fragment, null, props.children);
  };

  const renderRule: RendererRenderRule = (styles, param) => {
    // Emotion has a bug with passing empty objects, should be fixed in upstream
    if (Object.keys(styles).length === 0) {
      return '';
    }

    const cache = param.direction === 'ltr' ? cacheLtr : cacheRtl;
    const style = param.disableAnimations ? disableAnimations(styles) : styles;
    const serialized = serializeStyles([invokeKeyframes(cache, style) as any], cache.registered, undefined);

    insertStyles(cache, serialized, true);

    return `${cache.key}-${serialized.name}`;
  };

  const renderGlobal = (styles, selector) => {
    if (typeof styles === 'string') {
      const serializedStyles = serializeStyles([styles], null);

      cacheLtr.insert(``, serializedStyles, sheet, false);
    }

    if (typeof styles === 'object') {
      const serializedStyles = serializeStyles([{ [selector]: styles }], null);

      cacheLtr.insert(``, serializedStyles, sheet, false);
    }
  };
  const renderFont = font => {
    const { localAlias, ...otherProperties } = font.props;

    const fontLocals = getFontLocals(localAlias);
    const fontFamily = toCSSString(font.name);

    renderGlobal(
      {
        ...otherProperties,
        src: generateFontSource(font.paths, fontLocals),
        fontFamily,
      },
      '@font-face',
    );
  };

  return {
    renderGlobal,
    renderFont,
    renderRule,

    Provider,
  };
}
