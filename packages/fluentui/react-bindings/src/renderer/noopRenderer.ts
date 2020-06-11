import * as React from 'react';
import { Renderer } from './types';

const Provider: React.FC = props => React.createElement(React.Fragment, null, props.children);

export const noopRenderer: Renderer = {
  renderFont: () => {},
  renderGlobal: () => {},
  renderRule: () => '',

  Provider,
};
