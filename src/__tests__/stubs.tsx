// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import * as React from 'react';
import { render as testRender } from '@testing-library/react';
import { UseCollectionResult, CollectionRef } from '../index.js';
import { getTrackableValue } from '../operations/index.js';

export type Item = { id: string; date?: Date };

export function render(jsx: React.ReactElement) {
  const queries = testRender(jsx);
  return {
    getVisibleItems: () => queries.queryAllByTestId('item').map(element => element.textContent),
    getSelectedItems: () =>
      queries
        .queryAllByTestId('item')
        .filter(element => element.dataset['selected'] === 'true')
        .map(element => element.textContent),
    getSelectedLength: () => queries.getByTestId('selected-items').textContent,
    getMatchesCount: () => queries.getByTestId('matches-count').textContent,
    getPagesCount: () => queries.getByTestId('pages-count').textContent,
    getCurrentPage: () => queries.getByTestId('current-page').textContent,
    findFilterInput: () => queries.getByTestId('input') as HTMLInputElement,
    findPropertyFilterChange: () => queries.getByTestId('property-filtering-change') as HTMLButtonElement,
    findPropertyOptions: () => queries.getByTestId('filtering-options').textContent,
    findEmptySlot: () => queries.queryByTestId('empty'),
    findPreviousPage: () => queries.getByTestId('previous-page'),
    findCurrentPage: () => queries.getByTestId('current-page'),
    findNextPage: () => queries.getByTestId('next-page'),
    findSortBy: () => queries.getByTestId('sortby'),
    findSortedBy: () => queries.getByTestId('sortedby'),
    findItem: (index: number) => queries.queryAllByTestId('item')[index],
    rerender: queries.rerender,
  };
}

type TableProps = Omit<UseCollectionResult<Item>['collectionProps'], 'ref'> & {
  items: readonly Item[];
  spy?: () => void;
};

const Table = React.forwardRef<CollectionRef, TableProps>(
  (
    {
      empty,
      items,
      sortingColumn,
      sortingDescending,
      onSortingChange,
      selectedItems,
      onSelectionChange,
      trackBy,
      spy,
    }: TableProps,
    ref: React.Ref<CollectionRef>
  ) => {
    const scrollToTop = () => {
      spy && spy();
    };
    React.useImperativeHandle(ref, () => ({
      scrollToTop,
    }));
    return (
      <div>
        <div data-testid="sortedby">
          {((sortingColumn && sortingColumn.sortingField) || '') + !!sortingDescending ? ' descending' : ''}
        </div>
        <button
          data-testid="sortby"
          onClick={() =>
            onSortingChange &&
            onSortingChange(
              new CustomEvent('cloudscape', {
                detail: {
                  sortingColumn: { sortingField: 'id' },
                  isDescending: !!sortingColumn && !sortingDescending,
                },
              })
            )
          }
        >
          sort by id
        </button>
        {items.length === 0 && <div data-testid="empty">{empty}</div>}
        <span data-testid="selected-items">{selectedItems && selectedItems.length}</span>
        <ul>
          {items.map(item => (
            <li
              key={item.id}
              data-testid="item"
              data-selected={
                selectedItems &&
                (selectedItems.indexOf(item) !== -1 ||
                  (trackBy &&
                    selectedItems.filter(
                      selectedItem => getTrackableValue(trackBy, selectedItem) === getTrackableValue(trackBy, item)
                    ).length > 0))
                  ? 'true'
                  : 'false'
              }
              onClick={() =>
                onSelectionChange &&
                onSelectionChange(new CustomEvent('cloudscape', { detail: { selectedItems: [item] } }))
              }
            >
              {item.id}
            </li>
          ))}
        </ul>
      </div>
    );
  }
);

function TextFilter({ disabled, filteringText, onChange }: UseCollectionResult<Item>['filterProps']) {
  return (
    <div>
      <input
        type="text"
        data-testid="input"
        value={filteringText}
        disabled={disabled}
        onChange={event =>
          onChange(new CustomEvent('cloudscape', { detail: { filteringText: event.currentTarget.value } }))
        }
      />
    </div>
  );
}

function PropertyFilter({
  query,
  onChange,
  filteringOptions,
  filteringProperties,
}: UseCollectionResult<Item>['propertyFilterProps']) {
  return (
    <div>
      <button
        data-testid="property-filtering-change"
        onClick={() => onChange(new CustomEvent('cloudscape', { detail: { tokens: [], operation: 'and' } }))}
      >
        Call change
      </button>
      <span data-testid="operation">{query.operation}</span>
      <ul data-testid="tokens">
        {query.tokens.map((token, index) => (
          <li key={index}>
            <span className="property-key">{token.propertyKey}</span>
            <span className="operator">{token.operator}</span>
            <span className="value">{token.value}</span>
          </li>
        ))}
      </ul>
      <ul data-testid="filtering-properties">
        {filteringProperties.map(({ key, groupValuesLabel, propertyLabel, operators }, index) => (
          <li id={`property-${index}`} key={index}>
            <span className="key">{key}</span>
            <span className="values-label">{groupValuesLabel}</span>
            <span className="property-label">{propertyLabel}</span>
            <span className="operators">{operators?.join(',')}</span>
          </li>
        ))}
      </ul>
      <ul data-testid="filtering-options">
        {filteringOptions.map(({ propertyKey, value }, index) => (
          <li id={`option-${index}`} key={index}>
            <span className="property-key">{propertyKey}</span>
            <span className="value">{value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Pagination({
  pagesCount,
  disabled,
  currentPageIndex,
  onChange,
}: UseCollectionResult<Item>['paginationProps']) {
  const changePage = (index: number) =>
    onChange(new CustomEvent('cloudscape', { detail: { currentPageIndex: index } }));
  return (
    <ul>
      <li>
        <button data-testid="previous-page" disabled={disabled} onClick={() => changePage(currentPageIndex - 1)}>
          &lt;
        </button>
      </li>
      <li>
        <span data-testid="current-page" onClick={() => changePage(currentPageIndex)}>
          {currentPageIndex}
        </span>
      </li>
      <li>
        <span data-testid="pages-count">{pagesCount}</span>
      </li>
      <li>
        <button data-testid="next-page" disabled={disabled} onClick={() => changePage(currentPageIndex + 1)}>
          &gt;
        </button>
      </li>
    </ul>
  );
}

export function Demo({
  items,
  collectionProps,
  filteredItemsCount,
  filterProps,
  paginationProps,
  propertyFilterProps,
  spy,
}: UseCollectionResult<Item> & { spy?: () => void }) {
  return (
    <>
      <div data-testid="matches-count">{filteredItemsCount}</div>
      <Table {...collectionProps} items={items} spy={spy} />
      <TextFilter {...filterProps} />
      <PropertyFilter {...propertyFilterProps} />
      <Pagination {...paginationProps} />
    </>
  );
}
