import { Request, Response } from 'express';
import { sendSuccess, sendError } from '../utils/response';
import { prisma } from '../config/database';
import { ErrorCodes } from '../constants/errors';