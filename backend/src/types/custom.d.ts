// Proširenje tipova za Express Request i Response
import { JwtPayload } from 'jsonwebtoken';
import express from 'express';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        username: string;
        role: string;
      } & JwtPayload;
    }
  }
}
