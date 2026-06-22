import { isPlainObject } from "@reduxjs/toolkit"
import {
  type Generated,
  type KyselyPlugin,
  OperationNodeTransformer,
  type PluginTransformQueryArgs,
  type PluginTransformResultArgs,
  type PrimitiveValueListNode,
  type QueryResult,
  type RootOperationNode,
  type UnknownRow,
  type ValueNode,
} from "kysely"

class SqliteBooleanTransformer extends OperationNodeTransformer {
  override transformPrimitiveValueList(
    node: PrimitiveValueListNode,
  ): PrimitiveValueListNode {
    return {
      ...super.transformPrimitiveValueList(node),
      values: node.values.map((value) =>
        typeof value === "boolean" ? (value ? 1 : 0) : value,
      ),
    }
  }

  override transformValue(node: ValueNode): ValueNode {
    return {
      ...super.transformValue(node),
      value:
        typeof node.value === "boolean" ? (node.value ? 1 : 0) : node.value,
    }
  }
}

type BooleanFields<DB> = DB[keyof DB] extends infer T
  ? T extends T
    ? {
        [K in keyof T]: T[K] extends Generated<boolean> ? K : never
      }[keyof T]
    : never
  : never

type BooleanFieldMap<DB> = {
  [K in BooleanFields<DB>]: boolean
}

export interface BooleanPluginOptions<DB> {
  fields: BooleanFieldMap<DB>
}

export class BooleanPlugin<DB> implements KyselyPlugin {
  private transformer = new SqliteBooleanTransformer()
  private fields: BooleanFieldMap<DB>

  public constructor({ fields }: BooleanPluginOptions<DB>) {
    this.fields = fields
  }

  public transformQuery(args: PluginTransformQueryArgs): RootOperationNode {
    return this.transformer.transformNode(args.node)
  }

  public transformResult(
    args: PluginTransformResultArgs,
  ): Promise<QueryResult<UnknownRow>> {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (args.result.rows && Array.isArray(args.result.rows)) {
      return Promise.resolve({
        ...args.result,
        rows: args.result.rows.map((row) => this.mapRow(row)),
      })
    }

    return Promise.resolve(args.result)
  }

  protected mapRow(row: UnknownRow): UnknownRow {
    return Object.keys(row).reduce<UnknownRow>((obj, key) => {
      let value = row[key]
      if (Array.isArray(value)) {
        value = value.map((it: unknown) => (canMap(it) ? this.mapRow(it) : it))
      } else if (canMap(value)) {
        value = this.mapRow(value)
      }

      obj[key] = this.fields[key as BooleanFields<DB>] ? !!value : value

      return obj
    }, {})
  }
}

function canMap(obj: unknown): obj is Record<string, unknown> {
  return isPlainObject(obj)
}
