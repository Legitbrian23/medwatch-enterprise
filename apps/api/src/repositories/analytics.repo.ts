import { Db } from 'mongodb';
import type {
  BelowReorderRow,
  ExpiringBatch,
  StockoutByDistrict,
} from '@medwatch/shared';

/**
 * Q7.1 — Unresolved stock-out alerts with facility and medicine names resolved.
 */
export async function getUnresolvedStockouts(db: Db) {
  return db
    .collection('alerts')
    .aggregate([
      { $match: { type: 'stockout', resolved: false } },
      {
        $lookup: {
          from: 'health_facilities',
          localField: 'facility_id',
          foreignField: '_id',
          as: 'facility',
        },
      },
      { $unwind: '$facility' },
      {
        $lookup: {
          from: 'medicines',
          localField: 'medicine_id',
          foreignField: '_id',
          as: 'medicine',
        },
      },
      { $unwind: '$medicine' },
      {
        $project: {
          _id: 1,
          facility_id: 1,
          medicine_id: 1,
          facility_name: '$facility.name',
          medicine_name: '$medicine.generic_name',
          severity: 1,
          raised_on: 1,
        },
      },
      { $sort: { raised_on: -1 } },
    ])
    .toArray();
}

/**
 * Q7.2 — Total stock-out days per district (only districts with > 0 days).
 * Expected (seed): Arua=21, Kotido=14, Nakaseke=9
 */
export async function getStockoutDaysByDistrict(db: Db): Promise<StockoutByDistrict[]> {
  return db
    .collection('stock_records')
    .aggregate<StockoutByDistrict>([
      {
        $lookup: {
          from: 'health_facilities',
          localField: 'facility_id',
          foreignField: '_id',
          as: 'fac',
        },
      },
      { $unwind: '$fac' },
      {
        $group: {
          _id: '$fac.district',
          total_stockout_days: { $sum: '$stockout_days' },
        },
      },
      { $match: { total_stockout_days: { $gt: 0 } } },
      { $sort: { total_stockout_days: -1 } },
      { $project: { _id: 0, district: '$_id', total_stockout_days: 1 } },
    ])
    .toArray();
}

/**
 * Q7.3 — Batches expiring within `days` of `asOfDate`.
 * Uses $unwind to open the embedded batches array.
 */
export async function getExpiringBatches(
  db: Db,
  days: number,
  asOfDate: Date,
): Promise<ExpiringBatch[]> {
  const cutoff = new Date(asOfDate.getTime() + days * 24 * 60 * 60 * 1000);

  return db
    .collection('stock_records')
    .aggregate<ExpiringBatch>([
      { $unwind: '$batches' },
      { $match: { 'batches.expiry': { $lte: cutoff } } },
      {
        $lookup: {
          from: 'health_facilities',
          localField: 'facility_id',
          foreignField: '_id',
          as: 'fac',
        },
      },
      { $unwind: '$fac' },
      {
        $lookup: {
          from: 'medicines',
          localField: 'medicine_id',
          foreignField: '_id',
          as: 'med',
        },
      },
      { $unwind: '$med' },
      {
        $project: {
          _id: 0,
          facility_id: 1,
          medicine_id: 1,
          facility_name: '$fac.name',
          medicine_name: '$med.generic_name',
          batch_no: '$batches.batch_no',
          expiry: '$batches.expiry',
          qty: '$batches.qty',
        },
      },
      { $sort: { expiry: 1 } },
    ])
    .toArray();
}

/**
 * Q7.5 — Stock records where closing < medicine.reorder_level.
 * Expected (seed): exactly 5 rows.
 */
export async function getBelowReorder(db: Db): Promise<BelowReorderRow[]> {
  return db
    .collection('stock_records')
    .aggregate<BelowReorderRow>([
      {
        $lookup: {
          from: 'medicines',
          localField: 'medicine_id',
          foreignField: '_id',
          as: 'med',
        },
      },
      { $unwind: '$med' },
      { $match: { $expr: { $lt: ['$closing', '$med.reorder_level'] } } },
      {
        $lookup: {
          from: 'health_facilities',
          localField: 'facility_id',
          foreignField: '_id',
          as: 'fac',
        },
      },
      { $unwind: '$fac' },
      {
        $project: {
          _id: 0,
          facility: '$fac.name',
          medicine: '$med.generic_name',
          closing: 1,
          reorder_level: '$med.reorder_level',
        },
      },
    ])
    .toArray();
}
