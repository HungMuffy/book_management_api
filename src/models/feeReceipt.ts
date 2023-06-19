import { Document, Schema, model, Types } from 'mongoose';
import UserFinancials from './userFinancials';
import AppError from '../utils/appError';
import { IFeeReceipt, IUserFinancials } from '../interfaces/model.interfaces';

const FeeReceiptSchema = new Schema(
  {
    userFinancials: {
      type: Types.ObjectId,
      required: true
    },
    balance: {
      type: String,
      required: true
    },
    totalDebt: {
      type: Number,
      required: true
    },
    amountPaid: {
      type: Number,
      required: true
    }
  },
  {
    toObject: { virtuals: true },
    toJSON: { virtuals: true }
  }
);

FeeReceiptSchema.virtual('remainingBalance').get(function (this: IFeeReceipt) {
  return this.totalDebt - this.amountPaid;
});

FeeReceiptSchema.pre<IFeeReceipt>('save', async function (next) {
  if (this.amountPaid > this.totalDebt) {
    const error = new AppError('Amount paid cannot be greater than total debt', 400);
    return next(error);
  }

  const userFinancials: IUserFinancials | null = await UserFinancials.findById(this.userFinancials);
  if (!userFinancials) {
    return next(new AppError(`Can't find the userFinancial`, 404));
  }

  userFinancials.money -= this.amountPaid;
  userFinancials.totalDebt -= this.amountPaid;
  userFinancials.save();
  return next();
});

const FeeReceipt = model<IFeeReceipt>('LateFeeReceipt', FeeReceiptSchema);
export default FeeReceipt;
