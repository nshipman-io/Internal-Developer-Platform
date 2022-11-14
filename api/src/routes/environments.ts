import express, {Express, Router} from "express";
import {EnvironmentsController} from "../controllers/environments";
import { body, validationResult } from "express-validator";


export const router = express.Router();

const controller = new EnvironmentsController();

router.get("/", (req, res) => controller.getAllEnvironments(req,res));
router.post("/", body('environment').notEmpty(), body('stack').notEmpty(), (req: express.Request, res: express.Response, next) => controller.createEnvironment(req,res));
router.delete("/:name", (req, res) =>controller.deleteEnvironment(req,res));