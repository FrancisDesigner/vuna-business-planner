import test from 'node:test';
import assert from 'node:assert/strict';

import { getExpertPDFFileName } from './expertPdf';

test('expert pdf filename is stable and safe for download', () => {
  const fileName = getExpertPDFFileName('Factory Upgrade Case');

  assert.equal(fileName, 'Vuna_Expert_Factory_Upgrade_Case.pdf');
});
