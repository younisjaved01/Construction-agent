/**
 * Hard per-project spend cap. `check()` is called with an ESTIMATE before every
 * paid job; if it would push total spend over the cap it throws, so a runaway
 * pipeline can never quietly burn your budget. Cache hits (cost 0) never trip it.
 */
export class BudgetExceededError extends Error {
  constructor(
    readonly spent: number,
    readonly attempted: number,
    readonly cap: number,
  ) {
    super(
      `Budget cap $${cap.toFixed(2)} would be exceeded: spent $${spent.toFixed(4)} + ` +
        `$${attempted.toFixed(4)} > $${cap.toFixed(2)}. Lower the quality tier, enable a ` +
        `cheaper/local provider, or raise --budget.`,
    );
    this.name = 'BudgetExceededError';
  }
}

export class BudgetGuard {
  private _spent = 0;
  constructor(private readonly capUsd: number = Infinity) {}

  get spent(): number {
    return this._spent;
  }
  get remaining(): number {
    return this.capUsd - this._spent;
  }

  /** Throw if this estimated cost would breach the cap. */
  check(estimatedCost: number): void {
    if (this._spent + estimatedCost > this.capUsd) {
      throw new BudgetExceededError(this._spent, estimatedCost, this.capUsd);
    }
  }

  /** Record actual spend (0 on a cache hit). */
  record(actualCost: number): void {
    this._spent += actualCost;
  }
}
