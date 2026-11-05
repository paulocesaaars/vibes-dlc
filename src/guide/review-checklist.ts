/** O que conferir em cada artefato. É dado estático. */

export type ReviewChecklist = { artifactName: string; items: string[] };

const GENERIC: ReviewChecklist = {
  artifactName: 'generic',
  items: [
    'Reflete o que foi pedido, sem inventar nada?',
    'As suposições estão marcadas como suposições?',
    'Falta alguma restrição que só você conhece?',
  ],
};

const REQUIREMENTS = [
  'Reflete o que foi pedido, sem inventar requisitos?',
  'Cada item pode ser verificado com um teste ou critério claro?',
  'As decisões citam as alternativas descartadas?',
];

const CHECKLISTS: Record<string, string[]> = {
  'intent-statement': [
    'O problema descrito é mesmo o seu?',
    'As suposições estão marcadas como suposições?',
    'Falta alguma restrição que só você conhece?',
  ],
  requirements: REQUIREMENTS,
  stories: REQUIREMENTS,
  decisions: REQUIREMENTS,
  'functional-spec': [
    'Combina com a arquitetura aprovada?',
    'Os erros são tratados, e não escondidos?',
    'Os testes verificam o comportamento de verdade?',
  ],
  'code-summary': [
    'O que foi construído corresponde ao plano aprovado?',
    'Os desvios do plano estão explicados?',
    'Se houver tela nova, você a abriu e comparou com o DESIGN.md? Testes e revisões não conferem a aparência.',
  ],
};

function artifactNameOf(artifactPath: string): string {
  const fileName = artifactPath.split('/').at(-1) ?? artifactPath;
  return fileName.replace(/\.[^.]+$/, '');
}

/** A lista de um artefato, ou a genérica quando ele não tem uma própria. */
export function reviewChecklist(artifactPath: string): ReviewChecklist {
  const artifactName = artifactNameOf(artifactPath);
  const items = Object.hasOwn(CHECKLISTS, artifactName) ? CHECKLISTS[artifactName] : undefined;
  return items ? { artifactName, items } : GENERIC;
}
