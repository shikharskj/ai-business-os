export class TaxError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TaxError";
  }
}

export class InvalidGstinError extends TaxError {
  constructor(gstin: string) {
    super(`Invalid GSTIN: "${gstin}"`);
    this.name = "InvalidGstinError";
  }
}

export class InvalidPlaceOfSupplyError extends TaxError {
  constructor(code: string) {
    super(`Invalid place of supply state code: "${code}"`);
    this.name = "InvalidPlaceOfSupplyError";
  }
}

export class InvalidTaxRateError extends TaxError {
  constructor(rateBps: number) {
    super(`Invalid tax rate (bps): ${rateBps}. Expected an integer from 0 through 10000.`);
    this.name = "InvalidTaxRateError";
  }
}
