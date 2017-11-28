import React from 'react';
import { Form, FormGroup, FormControl, Col, ControlLabel } from 'react-bootstrap';

const ClueEditor = (props) => {
  var elements = [];
  for (let i = 0; i < props.clues.length; i++) {
    elements.push(
      <FormGroup key={"clue" + i}>
        <Col componentClass={ControlLabel} sm={2}>{props.clues[i].get('answer')}</Col>
        <Col sm={10}>
          <FormControl type="text" defaultValue={props.clues[i].get('clue')}/>
        </Col>
      </FormGroup>
    );
  }
  return <div>
    <Form horizontal>{elements}</Form>
  </div>;
}

export { ClueEditor };
