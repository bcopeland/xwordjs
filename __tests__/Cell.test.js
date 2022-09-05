import React from 'react';
import Enzyme, {shallow, mount} from 'enzyme';
import Adapter from 'enzyme-adapter-react-15';
import Cell from '../src/Cell';

Enzyme.configure({adapter: new Adapter()});

it('renders hidden when hidden', () => {
  const cell = mount(<Cell isHidden={true} value=" "/>);
  expect(cell.find('div.xwordjs-cell-hidden')).toHaveLength(1);
});

it('renders black when black', () => {
  const cell = mount(<Cell isBlack={true} value=" "/>);
  expect(cell.find('div.xwordjs-cell-black')).toHaveLength(1);
});

it('renders shaded when shaded', () => {
  const cell = mount(<Cell isShaded={true} value=" "/>);
  expect(cell.find('div.xwordjs-cell-shaded')).toHaveLength(1);
});

it('renders left border when left', () => {
  const cell = mount(<Cell isLeft={true} value=" "/>);
  expect(cell.find('div.xwordjs-cell-left')).toHaveLength(1);
});

it('renders top border when top', () => {
  const cell = mount(<Cell isTop={true} value=" "/>);
  expect(cell.find('div.xwordjs-cell-top')).toHaveLength(1);
});

it('renders in focus when focused', () => {
  const cell = mount(<Cell isFocus={true} value=" "/>);
  expect(cell.find('div.xwordjs-cell-focus')).toHaveLength(1);
});

it('renders in incorrect focus when focused and incorrect', () => {
  const cell = mount(<Cell isFocus={true} isIncorrect={true} value=" "/>);
  expect(cell.find('div.xwordjs-cell-focus-incorrect')).toHaveLength(1);
});

it('renders active when active', () => {
  const cell = mount(<Cell isActive={true} value=" "/>);
  expect(cell.find('div.xwordjs-cell-active')).toHaveLength(1);
});

it('renders active and incorrect when active and incorrect', () => {
  const cell = mount(<Cell isActive={true} isIncorrect={true} value=" "/>);
  expect(cell.find('div.xwordjs-cell-active-incorrect')).toHaveLength(1);
});

it('renders incorrect when incorrect and not hidden', () => {
  const cell = mount(<Cell isIncorrect={true} value=" "/>);
  expect(cell.find('div.xwordjs-cell-incorrect')).toHaveLength(1);

  const cell2 = mount(<Cell isIncorrect={true} isHidden={true} value=" "/>);
  expect(cell2.find('div.xwordjs-cell-incorrect')).toHaveLength(0);
});

it('renders circled when circled', () => {
  const cell = mount(<Cell isCircled={true} value=" "/>);
  expect(cell.find('div.xwordjs-cell-circled')).toHaveLength(1);
});

it('renders smaller font when rebus', () => {
  function fontSize(cell) {
    return parseInt(getComputedStyle(cell
      .find('div.xwordjs-cell-text').getDOMNode())
      .getPropertyValue("font-size"));
  }

  const normalCell = mount(<Cell value="A"/>);
  const rebusCell = mount(<Cell value="ABCDEF"/>);

  const normalSize = fontSize(normalCell);
  const rebusSize = fontSize(rebusCell);

  console.debug("normal " + normalSize);
  console.debug("rebus " + rebusSize);

  expect(rebusSize).toBeLessThan(normalSize);
});
