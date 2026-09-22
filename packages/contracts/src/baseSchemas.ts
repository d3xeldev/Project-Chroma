import * as Schema from "effect/Schema";

export const TrimmedNonEmptyString = Schema.Trim.check(Schema.isNonEmpty());

export const NonNegativeInt = Schema.Int.check(Schema.isGreaterThanOrEqualTo(0));
export const Port = Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: 65535 }));
