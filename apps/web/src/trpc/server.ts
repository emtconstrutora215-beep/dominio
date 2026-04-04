import { router } from './trpc';
import { projectsRouter } from './routers/projects';
import { financialRouter } from './routers/financial';
import { budgetRouter } from './routers/budget';
import { dailyReportRouter } from './routers/daily-report';
import { purchasingRouter } from './routers/purchasing';
import { companyRouter } from './routers/company';
import { stockRouter } from './routers/stock';
import { bankRouter } from './routers/bank';
import { nfeRouter } from './routers/nfe';
import { scheduleRouter } from './routers/schedule';
import { contractRouter } from './routers/contract';
import { measurementRouter } from './routers/measurement';
import { biRouter } from './routers/bi';
import { contactRouter } from './routers/contact';
import { jobRoleRouter } from './routers/jobRole';
import { catalogItemRouter } from './routers/catalogItem';
import { compositionRouter } from './routers/composition';

export const appRouter = router({
  projects: projectsRouter,
  financial: financialRouter,
  budget: budgetRouter,
  dailyReport: dailyReportRouter,
  purchasing: purchasingRouter,
  company: companyRouter,
  stock: stockRouter,
  bank: bankRouter,
  nfe: nfeRouter,
  schedule: scheduleRouter,
  contract: contractRouter,
  measurement: measurementRouter,
  bi: biRouter,
  contact: contactRouter,
  jobRole: jobRoleRouter,
  catalogItem: catalogItemRouter,
  composition: compositionRouter,
});

export type AppRouter = typeof appRouter;
