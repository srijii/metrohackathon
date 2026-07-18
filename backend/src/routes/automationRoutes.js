import { Router } from 'express'
import {
  executePlan,
  getFiles,
  planCommand,
} from '../controllers/automationController.js'

const router = Router()

router.get('/files', getFiles)
router.post('/plan', planCommand)
router.post('/execute', executePlan)

export default router
