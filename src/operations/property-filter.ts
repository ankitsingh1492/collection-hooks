// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import { PropertyFilterOperator, PropertyFilterQuery, PropertyFilterToken, UseCollectionOptions } from '../interfaces';

const filterUsingOperator = (itemValue: any, tokenValue: string, operator: PropertyFilterOperator) => {
  switch (operator) {
    case '<':
      return itemValue < tokenValue;
    case '<=':
      return itemValue <= tokenValue;
    case '>':
      return itemValue > tokenValue;
    case '>=':
      return itemValue >= tokenValue;
    case '=':
      // eslint-disable-next-line eqeqeq
      return itemValue == tokenValue;
    case '!=':
      // eslint-disable-next-line eqeqeq
      return itemValue != tokenValue;
    case ':':
      return (itemValue + '').toLowerCase().indexOf((tokenValue + '').toLowerCase()) > -1;
    case '!:':
      return (itemValue + '').toLowerCase().indexOf((tokenValue + '').toLowerCase()) === -1;
  }
};

function freeTextFilter<T>(
  value: string,
  item: T,
  operator: PropertyFilterOperator,
  filteringPropertiesMap: FilteringPropertiesMap<T>
): boolean {
  const matches = Object.keys(filteringPropertiesMap).some(propertyKey => {
    const { operators } = filteringPropertiesMap[propertyKey as keyof typeof filteringPropertiesMap];
    return !!operators[operator] && filterUsingOperator(item[propertyKey as keyof typeof item], value, ':');
  });
  return operator === ':' ? matches : !matches;
}

function filterByToken<T>(token: PropertyFilterToken, item: T, filteringPropertiesMap: FilteringPropertiesMap<T>) {
  if (token.propertyKey) {
    // token refers to a unknown property or uses an unsupported operator
    if (
      !(token.propertyKey in filteringPropertiesMap) ||
      !(token.operator in filteringPropertiesMap[token.propertyKey as keyof FilteringPropertiesMap<T>].operators)
    ) {
      return false;
    }
    const itemValue: any = fixupFalsyValues(item[token.propertyKey as keyof T]);
    return filterUsingOperator(itemValue, token.value, token.operator);
  }
  return freeTextFilter(token.value, item, token.operator, filteringPropertiesMap);
}

function defaultFilteringFunction<T extends Record<string, any>>(filteringPropertiesMap: FilteringPropertiesMap<T>) {
  return (item: T, { tokens, operation }: PropertyFilterQuery) => {
    let result = operation === 'and' ? true : !tokens.length;
    for (const token of tokens) {
      result =
        operation === 'and'
          ? result && filterByToken(token, item, filteringPropertiesMap)
          : result || filterByToken(token, item, filteringPropertiesMap);
    }
    return result;
  };
}

export type FilteringPropertiesMap<T> = {
  [key in keyof T]: {
    operators: {
      [key in PropertyFilterOperator]?: true;
    };
  };
};
export function propertyFilter<T>(
  items: ReadonlyArray<T>,
  query: PropertyFilterQuery,
  { filteringFunction, filteringProperties }: NonNullable<UseCollectionOptions<T>['propertyFiltering']>
): ReadonlyArray<T> {
  const filteringPropertiesMap = filteringProperties.reduce<FilteringPropertiesMap<T>>(
    (
      acc: FilteringPropertiesMap<T>,
      {
        key,
        operators,
        defaultOperator,
      }: NonNullable<UseCollectionOptions<T>['propertyFiltering']>['filteringProperties'][0]
    ) => {
      const operatorSet: { [key: string]: true } = { [defaultOperator ?? '=']: true };
      operators?.forEach(op => (operatorSet[op] = true));
      acc[key as keyof T] = {
        operators: operatorSet,
      };
      return acc;
    },
    {} as FilteringPropertiesMap<T>
  );
  const filter = filteringFunction || defaultFilteringFunction(filteringPropertiesMap);
  return items.filter(item => filter(item, query));
}

export const fixupFalsyValues = <T>(value: T): T | string => {
  if (typeof value === 'boolean') {
    return value + '';
  }
  if (value || (value as any as number) === 0) {
    return value;
  }
  return '';
};
