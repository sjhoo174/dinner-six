import { json, restaurants } from '../_shared.js';

export function onRequestGet() {
  return json({ restaurants });
}
