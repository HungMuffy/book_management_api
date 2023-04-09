import { NextFunction, Request, Response } from 'express';
import { Model } from 'mongoose';
import catchAsync from '../utils/catchAsync';
import AppError from '../utils/appError';

interface UpdateOneFn {
  (req: Request, res: Response, next: NextFunction): Promise<Response<any>> | void;
}

interface CreateOneFn {
  (req: Request, res: Response, next: NextFunction): Promise<Response<any>> | void;
}

interface DeleteOneFn {
  (req: Request, res: Response, next: NextFunction): Promise<Response<any>> | void;
}

interface GetAllFn {
  (req: Request, res: Response, next: NextFunction): Promise<Response<any>> | void;
}

const getAll = (Model: Model<any>): GetAllFn => {
  return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const doc = await Model.find();

    res.status(200).json({
      status: 'success',
      data: {
        docs: doc
      }
    });
  });
};

const updateOne = (Model: Model<any>): UpdateOneFn => {
  return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const doc: Document | null = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    if (!doc) {
      return next(new AppError(`No document found with that ID`, 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        doc
      }
    });
  });
};

const createOne = (Model: Model<any>): CreateOneFn => {
  return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const doc = await Model.create(req.body);

    res.status(201).json({
      status: 'success',
      data: {
        doc
      }
    });
  });
};

const deleteOne = (Model: Model<any>): DeleteOneFn => {
  return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const doc = await Model.findByIdAndDelete(req.params.id);
    if (!doc) {
      return next(new AppError(`No doc found with that ID`, 404));
    }

    res.status(204).json({
      status: 'success',
      data: null
    });
  });
};

const getOne = (Model: Model<any>) => {
  return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const doc = await Model.findById(req.params.id);

    if (!doc) {
      return next(new AppError(`No document found with that ID`, 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        doc
      }
    });
  });
};

export default {
  getAll,
  getOne,
  updateOne,
  createOne,
  deleteOne
};
