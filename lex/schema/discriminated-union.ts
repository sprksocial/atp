import { isPlainObject } from "../data/object.ts";
import {
  type Infer,
  Schema,
  type ValidationResult,
  type ValidatorContext,
} from "../validation.ts";
import { EnumSchema } from "./enum.ts";
import { LiteralSchema } from "./literal.ts";
import type { ObjectSchema } from "./object.ts";

export type DiscriminatedUnionVariant<Discriminator extends string> =
  ObjectSchema<Record<Discriminator, EnumSchema<any> | LiteralSchema<any>>>;

export type DiscriminatedUnionVariants<Discriminator extends string> =
  readonly [
    DiscriminatedUnionVariant<Discriminator>,
    ...DiscriminatedUnionVariant<Discriminator>[],
  ];

export type DiscriminatedUnionSchemaOutput<
  Variants extends readonly DiscriminatedUnionVariant<string>[],
> = Variants extends readonly [
  infer V extends DiscriminatedUnionVariant<string>,
  ...infer Rest extends readonly DiscriminatedUnionVariant<string>[],
] ? Infer<V> | DiscriminatedUnionSchemaOutput<Rest>
  : never;

export class DiscriminatedUnionSchema<
  const Discriminator extends string = any,
  const Variants extends DiscriminatedUnionVariants<Discriminator> = any,
> extends Schema<DiscriminatedUnionSchemaOutput<Variants>> {
  readonly variantsMap: Map<
    unknown,
    DiscriminatedUnionVariant<Discriminator>
  >;

  constructor(
    readonly discriminator: Discriminator,
    variants: Variants,
  ) {
    super();
    this.variantsMap = buildVariantsMap(discriminator, variants);
  }

  validateInContext(
    input: unknown,
    ctx: ValidatorContext,
  ): ValidationResult<DiscriminatedUnionSchemaOutput<Variants>> {
    if (!isPlainObject(input)) {
      return ctx.issueInvalidType(input, "object");
    }

    const { discriminator } = this;

    if (!Object.hasOwn(input, discriminator)) {
      return ctx.issueRequiredKey(input, discriminator);
    }

    const discriminatorValue = input[discriminator];

    const variant = this.variantsMap.get(discriminatorValue);
    if (variant) {
      return ctx.validate(input, variant) as ValidationResult<
        DiscriminatedUnionSchemaOutput<Variants>
      >;
    }

    return ctx.issueInvalidPropertyValue(
      input,
      discriminator as keyof typeof input & string,
      [...this.variantsMap.keys()],
    );
  }
}

function buildVariantsMap<Discriminator extends string>(
  discriminator: Discriminator,
  variants: DiscriminatedUnionVariants<Discriminator>,
): Map<unknown, DiscriminatedUnionVariant<Discriminator>> {
  const map = new Map<unknown, DiscriminatedUnionVariant<Discriminator>>();

  for (const variant of variants) {
    const schema = variant.shape[discriminator];
    if (schema instanceof LiteralSchema) {
      if (map.has(schema.value)) {
        throw new TypeError(
          `Overlapping discriminator value: ${schema.value}`,
        );
      }
      map.set(schema.value, variant);
    } else if (schema instanceof EnumSchema) {
      for (const val of schema.values) {
        if (map.has(val)) {
          throw new TypeError(`Overlapping discriminator value: ${val}`);
        }
        map.set(val, variant);
      }
    } else {
      throw new TypeError(
        `Discriminator schema must be a LiteralSchema or EnumSchema`,
      );
    }
  }

  return map;
}
