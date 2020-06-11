import createCache from '@emotion/cache';
import { serializeStyles } from '@emotion/serialize';
import { Plugin as StylisPlugin } from '@emotion/stylis';
import { insertStyles } from '@emotion/utils';
import { Renderer, RendererRenderRule } from '@fluentui/react-bindings';
import * as React from 'react';

export function createEmotionRenderer(target: Document): Renderer {
  const cacheLtr = createCache({
    container: target.head,
    key: 'fui',
    // stylisPlugins: [focusVisiblePluginStylis],
  });
  const cacheRtl = createCache({
    container: target.head,
    key: 'rfui',
    // stylisPlugins: [focusVisiblePluginStylis, rtlPlugin],
  });

  const renderRule: RendererRenderRule = (styles, param) => {
    // Emotion has a bug with passing empty objects, should be fixed in upstream
    if (Object.keys(styles).length === 0) {
      return '';
    }

    const cache = param.direction === 'ltr' ? cacheLtr : cacheRtl;
    const serialized = serializeStyles([styles as any], cache.registered, undefined);

    insertStyles(cache, serialized, true);

    return `${cache.key}-${serialized.name}`;
  };

  return {
    renderGlobal: () => {},
    renderFont: font => {
      // TODO to renderGlobal
    },
    renderRule,

    Provider: React.Fragment,
  };

  // export const keyframes = (keyframe: any): object => {
  //   const insertable = serializeStyles([keyframe as any], cache.registered, undefined);
  //
  //   const name = `animation-${insertable.name}`;
  //   const styles = `@keyframes ${name}{${insertable.styles}}`;
  //
  //   return {
  //     name,
  //     styles,
  //     anim: 1,
  //     toString() {
  //       return `_EMO_${name}_${styles}_EMO_`;
  //     },
  //   };
  // };
}
