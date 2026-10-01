export type GreenhouseCompany = {
  boardToken: string;
  company: string;
};

/**
 * Greenhouse boards to scan.
 *
 * Keep this list focused on companies that currently hire
 * software/data engineers in Spain, Europe or EMEA.
 *
 * Adding another Greenhouse company only requires one
 * entry here. The rest of the pipeline stays unchanged.
 */
export const GREENHOUSE_COMPANIES: GreenhouseCompany[] = [
  {
    boardToken: "affirm",
    company: "Affirm",
  },
  {
    boardToken: "alpaca",
    company: "Alpaca",
  },
  {
    boardToken: "customerio",
    company: "Customer.io",
  },
  {
    boardToken: "cloudbeds",
    company: "Cloudbeds",
  },
  {
    boardToken: "neo4j",
    company: "Neo4j",
  },
  {
    boardToken: "zencoder",
    company: "Zencoder",
  },
  {
    boardToken: "grafanalabs",
    company: "Grafana Labs",
  },
  {
    boardToken: "celonis",
    company: "Celonis",
  },
  {
    boardToken: "speechify",
    company: "Speechify",
  },
  {
    boardToken: "canonical",
    company: "Canonical",
  },
];
