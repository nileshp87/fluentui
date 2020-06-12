import createCache from '@emotion/cache';
import { serializeStyles } from '@emotion/serialize';
import { StyleSheet } from '@emotion/sheet';
import { EmotionCache, insertStyles } from '@emotion/utils';
import { Renderer, RendererRenderRule } from '@fluentui/react-bindings';
import * as React from 'react';

function getFontLocals(localAlias?: string | string[]): string[] {
  if (typeof localAlias === 'string') {
    return [localAlias];
  }

  if (Array.isArray(localAlias)) {
    return localAlias.slice();
  }

  return [];
}

function toCSSString(value: string): string {
  if (value.charAt(0) === '"') {
    return value;
  }

  return `"${value}"`;
}

function isBase64(property: string): boolean {
  return property.substr(0, 5) === 'data:';
}

function getFontUrl(src: string): string {
  if (isBase64(src)) {
    return src;
  }

  return `'${src}'`;
}

const formats: Record<string, string> = {
  '.woff': 'woff',
  '.woff2': 'woff2',
  '.eot': 'embedded-opentype',
  '.ttf': 'truetype',
  '.otf': 'opentype',
  '.svg': 'svg',
  '.svgz': 'svg',
};

const base64Formats: Record<string, string> = {
  'image/svg+xml': 'svg',
  'application/x-font-woff': 'woff',
  'application/font-woff': 'woff',
  'application/x-font-woff2': 'woff2',
  'application/font-woff2': 'woff2',
  'font/woff2': 'woff2',
  'application/octet-stream': 'truetype',
  'application/x-font-ttf': 'truetype',
  'application/x-font-truetype': 'truetype',
  'application/x-font-opentype': 'opentype',
  'application/vnd.ms-fontobject': 'embedded-opentype',
  'application/font-sfnt': 'sfnt',
};

function getFontFormat(src: string): string {
  if (isBase64(src)) {
    let mime = '';
    for (let i = 5; ; i++) {
      // 'data:'.length === 5
      const c = src.charAt(i);

      if (c === ';' || c === ',') {
        break;
      }

      mime += c;
    }

    const fmt = base64Formats[mime];
    if (fmt) {
      return fmt;
    }

    console.warn(
      `A invalid base64 font was used. Please use one of the following mime type: ${Object.keys(base64Formats).join(
        ', ',
      )}.`,
    );
  } else {
    let extension = '';
    for (let i = src.length - 1; ; i--) {
      const c = src.charAt(i);

      if (c === '.') {
        extension = c + extension;
        break;
      }

      extension = c + extension;
    }

    const fmt = formats[extension];
    if (fmt) {
      return fmt;
    }

    console.warn(`A invalid font-format was used in "${src}". Use one of these: ${Object.keys(formats).join(', ')}.`);
  }
  return '';
}

function generateFontSource(files: string[] = [], fontLocals: string[] = []): string {
  const localSource = fontLocals.reduce((src, local, index) => {
    const prefix = index > 0 ? ',' : '';
    const localUrl = getFontUrl(local);

    return `${src}${prefix}local(${localUrl})`;
  }, '');
  const urlSource = files.reduce((src, fileSource, index) => {
    const prefix = index > 0 ? ',' : '';
    const fileFormat = getFontFormat(fileSource);
    const fileUrl = getFontUrl(fileSource);

    return `${src}${prefix}url(${fileUrl}) format('${fileFormat}')`;
  }, '');
  const delimiter = localSource.length > 0 && urlSource.length > 0 ? ',' : '';

  return `${localSource}${delimiter}${urlSource}`;
}

export function createEmotionRenderer(target: Document): Renderer {
  const cacheLtr = createCache({
    container: target.head,
    key: 'fui',
    // stylisPlugins: [focusVisiblePluginStylis],
  }) as EmotionCache & { insert: Function };
  const cacheRtl = createCache({
    container: target.head,
    key: 'rfui',
    // stylisPlugins: [focusVisiblePluginStylis, rtlPlugin],
  });

  const sheet = new StyleSheet({
    key: `${cacheLtr.key}-global`,
    nonce: cacheLtr.sheet.nonce,
    container: cacheLtr.sheet.container,
  });

  const Provider: React.FC = props => {
    React.useEffect(() => {
      return () => sheet.flush();
    });

    return <>{props.children}</>;
  };

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
