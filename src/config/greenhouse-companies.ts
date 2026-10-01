export type GreenhouseCompany = {
  boardToken: string;
  company: string;
};

/**
 * Greenhouse boards to scan.
 *
 * Adding another Greenhouse company only requires one
 * entry here. The rest of the pipeline stays unchanged.
 */
export const GREENHOUSE_COMPANIES: GreenhouseCompany[] = [
  {
    boardToken: "affirm",
    company: "Affirm",
  },
];
