import { Validator } from "jsonschema";
import { ddbSchema, jsonSchema } from "../data/schemas";

export function jsonDiagramIsValid(obj) {
  return new Validator().validate(obj, jsonSchema, { base: "/" }).valid;
}

export function ddbDiagramIsValid(obj) {
  return new Validator().validate(obj, ddbSchema, { base: "/" }).valid;
}
