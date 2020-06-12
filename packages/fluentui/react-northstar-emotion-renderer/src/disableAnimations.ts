import { ICSSInJSStyle } from '@fluentui/styles';
import { isStyleObject } from './utils';

const animationProps = [
  'animation',
  'animationName',
  'animationDuration',
  'animationTimingFunction',
  'animationDelay',
  'animationIterationCount',
  'animationDirection',
  'animationFillMode',
  'animationPlayState',
];

export const disableAnimations = (styles: ICSSInJSStyle): ICSSInJSStyle => {
  return Object.keys(styles).reduce((acc, cssPropertyName: keyof ICSSInJSStyle) => {
    const cssPropertyValue = styles[cssPropertyName];

    if (animationProps.indexOf(cssPropertyName as string) !== -1) {
      return acc;
    }

    if (isStyleObject(cssPropertyValue)) {
      return {
        ...acc,
        [cssPropertyName]: disableAnimations(cssPropertyValue),
      };
    }

    return { ...acc, [cssPropertyName]: styles[cssPropertyName] };
  }, {});
};
