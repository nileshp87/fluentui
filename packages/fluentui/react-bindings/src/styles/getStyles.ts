import createCache from '@emotion/cache';
import { serializeStyles } from '@emotion/serialize';
import { insertStyles } from '@emotion/utils';
import { ComponentSlotStylesResolved, ComponentVariablesObject, ICSSInJSStyle, isDebugEnabled } from '@fluentui/styles';

import * as _ from 'lodash';

import { ComponentSlotClasses, ResolveStylesOptions, StylesContextValue } from '../styles/types';
import resolveVariables from './resolveVariables';
import resolveStyles from './resolveStyles';

export type GetStylesResult = {
  classes: ComponentSlotClasses;
  variables: ComponentVariablesObject;
  styles: ComponentSlotStylesResolved;
  theme: StylesContextValue['theme'];
};

const cache = createCache();

const css = (args: ICSSInJSStyle) => {
  const serialized = serializeStyles([args as any], cache.registered, undefined);
  insertStyles(cache, serialized, true);

  return `${cache.key}-${serialized.name}`;
};

const getStyles = (options: ResolveStylesOptions): GetStylesResult => {
  const { primaryDisplayName, telemetry } = options;

  //
  // To compute styles we are going through three stages:
  // - resolve variables (siteVariables => componentVariables + props.variables)
  // - resolve styles (with resolvedVariables & props.styles & props.design)
  // - compute classes (with resolvedStyles)
  // - conditionally add sources for evaluating debug information to component

  const telemetryPartStart = telemetry?.enabled ? performance.now() : 0;
  const resolvedVariables = resolveVariables(
    options.allDisplayNames,
    options.theme,
    options.props.variables,
    options.performance.enableVariablesCaching,
  );

  if (telemetry?.enabled && telemetry.performance[primaryDisplayName]) {
    telemetry.performance[primaryDisplayName].msResolveVariablesTotal += performance.now() - telemetryPartStart;
  }

  const { classes, resolvedStyles, resolvedStylesDebug } = resolveStyles(options, resolvedVariables, css);

  // conditionally add sources for evaluating debug information to component
  if (process.env.NODE_ENV !== 'production' && isDebugEnabled) {
    options.saveDebug({
      componentName: options.allDisplayNames.join(':'),
      componentVariables: _.filter(resolvedVariables._debug, variables => !_.isEmpty(variables.resolved)),
      componentStyles: resolvedStylesDebug,
      siteVariables: _.filter(options.theme.siteVariables._debug, siteVars => {
        if (_.isEmpty(siteVars) || _.isEmpty(siteVars.resolved)) {
          return false;
        }

        const keys = Object.keys(siteVars.resolved);
        if (keys.length === 1 && keys.pop() === 'fontSizes' && _.isEmpty(siteVars.resolved['fontSizes'])) {
          return false;
        }

        return true;
      }),
    });
  }

  return {
    classes,
    variables: resolvedVariables,
    styles: resolvedStyles,
    theme: options.theme,
  };
};

export default getStyles;
