/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { isEmpty } from 'lodash';
import { IAggConfigs } from '../aggs/agg_configs';
import { AggColumn, tabifyGetColumns } from './get_columns';

import { TabbedResponseWriterOptions } from './types';

interface TabbedAggColumn {
  id: string;
  value: string | number;
}

type TabbedAggRow = Record<TabbedAggColumn['id'], TabbedAggColumn['value']>;

/**
 * Writer class that collects information about an aggregation response and
 * produces a table, or a series of tables.
 */
export class TabbedAggResponseWriter {
  columns: AggColumn[];
  rows: TabbedAggRow[] = [];
  bucketBuffer: TabbedAggColumn[] = [];
  metricBuffer: TabbedAggColumn[] = [];

  private readonly partialRows: boolean;

  /**
   * @param {AggConfigs} aggs - the agg configs object to which the aggregation response correlates
   * @param {boolean} metricsAtAllLevels - setting to true will produce metrics for every bucket
   * @param {boolean} partialRows - setting to true will not remove rows with missing values
   */
  constructor(
    aggs: IAggConfigs,
    { metricsAtAllLevels = false, partialRows = false }: Partial<TabbedResponseWriterOptions>
  ) {
    this.partialRows = partialRows;

    this.columns = tabifyGetColumns(aggs.getResponseAggs(), !metricsAtAllLevels);
    this.rows = [];
  }

  /**
   * Create a new row by reading the row buffer and bucketBuffer
   */
  row() {
    const rowBuffer: TabbedAggRow = {};

    this.bucketBuffer.forEach(bucket => {
      rowBuffer[bucket.id] = bucket.value;
    });

    this.metricBuffer.forEach(metric => {
      rowBuffer[metric.id] = metric.value;
    });

    const isPartialRow =
      this.partialRows && !this.columns.every(column => rowBuffer.hasOwnProperty(column.id));

    if (!isEmpty(rowBuffer) && !isPartialRow) {
      this.rows.push(rowBuffer);
    }
  }

  response() {
    return {
      columns: this.columns,
      rows: this.rows,
    };
  }
}
