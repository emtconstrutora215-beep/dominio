import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { addDays, differenceInDays } from 'date-fns';

export const scheduleRouter = router({
  getProjectSchedule: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      // 1. Fetch project with stages, dependencies, and distributions
      const project = await ctx.prisma.project.findUnique({
        where: { id: input.projectId, companyId: ctx.companyId },
        include: {
          stages: {
            include: {
              successors: true, // Dependencies where this stage is predecessor
              predecessors: true, // Dependencies where this stage is successor
              distributions: true
            },
            orderBy: { startDate: 'asc' }
          }
        }
      });

      if (!project) throw new TRPCError({ code: 'NOT_FOUND' });

      // Transform into a flat list of tasks and links mapping for Gantt
      const tasks = project.stages.map((stage: any) => ({
        id: stage.id,
        name: stage.name,
        start: stage.startDate || project.startDate || new Date(),
        end: stage.endDate || addDays(project.startDate || new Date(), 7),
        progress: stage.percentageComplete,
        plannedCost: stage.plannedCost,
        actualCost: stage.actualCost
      }));

      // Flatten dependencies (Finish-to-Start only)
      const links = project.stages.flatMap((stage: any) => 
         (stage.successors as any[]).map((dep: any) => ({
           id: dep.id,
           source: dep.predecessorId,
           target: dep.successorId,
           type: 'FS' // Finish to Start
         }))
      );

      return { project, tasks, links };
    }),

  updateStageDates: protectedProcedure
    .input(z.object({
      stageId: z.string(),
      startDate: z.string(),
      endDate: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
       return ctx.prisma.projectStage.update({
         where: { id: input.stageId },
         data: {
           startDate: new Date(input.startDate),
           endDate: new Date(input.endDate)
         }
       });
    }),

  addDependency: protectedProcedure
    .input(z.object({
      predecessorId: z.string(),
      successorId: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
       // Avoid circular dep:
       if (input.predecessorId === input.successorId) {
         throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot depend on itself.' });
       }
       return ctx.prisma.stageDependency.create({
         data: input
       });
    }),

  removeDependency: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
       return ctx.prisma.stageDependency.delete({
         where: { id: input.id }
       });
    }),

  previewReschedule: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      draggedStageId: z.string(),
      newStartDate: z.string(),
      newEndDate: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
      // 1. Fetch entire stage graph for this project
      const stages = await ctx.prisma.projectStage.findMany({
        where: { projectId: input.projectId },
        include: { successors: true }
      });

      // Transform into memory maps
      const stageMap = new Map(stages.map((s: any) => [s.id, s]));
      const dragged = stageMap.get(input.draggedStageId);
      
      if (!dragged) throw new TRPCError({ code: 'NOT_FOUND' });

      // Calculate shift in days based on END DATE
      const oldEndDate = dragged.endDate || new Date();
      const newEnd = new Date(input.newEndDate);
      const shiftInDays = differenceInDays(newEnd, oldEndDate);

      if (shiftInDays === 0) return { affected: [] }; // No impact on successors if end date didn't change

      // We need to recursively find all downstream nodes
      const affected = new Map<string, { id: string, name: string, oldStart: Date, oldEnd: Date, newStart: Date, newEnd: Date }>();

      // BFS Queue to shift successors
      // If we shift a task forward by N days, all successors must shift forward by at least enough to not overlap
      const queue = [dragged.id];
      const virtualEndDates = new Map<string, Date>();
      virtualEndDates.set(dragged.id, newEnd);

      while (queue.length > 0) {
         const currentId = queue.shift()!;
         const currentEnd = virtualEndDates.get(currentId)!;
         const currentNode = stageMap.get(currentId)!;
         
         for (const dep of currentNode.successors) {
            const sucNode = stageMap.get(dep.successorId);
            if (!sucNode || !sucNode.startDate || !sucNode.endDate) continue;

            // In Finish-to-Start, successor's start date MUST be >= predecessor's end date
            if (sucNode.startDate < currentEnd) {
                // It violates. We must shift it.
                const diffViolated = differenceInDays(currentEnd, sucNode.startDate);
                
                // Keep the same duration
                const duration = differenceInDays(sucNode.endDate, sucNode.startDate);
                
                const virtualNewStart = addDays(sucNode.startDate, diffViolated);
                const virtualNewEnd = addDays(virtualNewStart, duration);

                // Only record if it actually shifted
                if (diffViolated > 0) {
                  affected.set(sucNode.id, {
                    id: sucNode.id,
                    name: sucNode.name,
                    oldStart: sucNode.startDate,
                    oldEnd: sucNode.endDate,
                    newStart: virtualNewStart,
                    newEnd: virtualNewEnd
                  });
                  
                  virtualEndDates.set(sucNode.id, virtualNewEnd);
                  queue.push(sucNode.id); // Visit its successors
                }
            }
         }
      }

      return {
        draggedDiff: shiftInDays,
        affected: Array.from(affected.values())
      };
    }),

  applyReschedule: protectedProcedure
    .input(z.object({
      updates: z.array(z.object({
        id: z.string(),
        startDate: z.string(),
        endDate: z.string()
      }))
    }))
    .mutation(async ({ ctx, input }) => {
       // Apply all shifts in a single transaction
       const promises = input.updates.map((u: any) => 
         ctx.prisma.projectStage.update({
           where: { id: u.id },
           data: {
             startDate: new Date(u.startDate),
             endDate: new Date(u.endDate)
           }
         })
       );
       await ctx.prisma.$transaction(promises);
       return { success: true, count: input.updates.length };
    }),

  getSCurve: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.prisma.project.findUnique({
        where: { id: input.projectId, companyId: ctx.companyId },
        include: {
          stages: {
             include: {
                distributions: { orderBy: { periodStart: 'asc' } },
                stockMovements: { where: { type: 'EXIT' } }
             }
          },
          financialSplits: {
             include: { financialEntry: true }
          }
        }
      });

      if (!project) throw new TRPCError({ code: 'NOT_FOUND' });

      // Daily distribution maps
      const plannedMap = new Map<string, number>(); // date -> cumulative planned value
      const actualMap = new Map<string, number>(); // date -> cumulative actual value

      let totalPlannedAcc = 0;
      let totalActualAcc = 0;

      // Calculate Planned Curve (Orçado)
      for (const stage of project.stages) {
         if (!stage.startDate || !stage.endDate) continue;
         
         if (stage.distributions && stage.distributions.length > 0) {
            // Manual overrides
            for (const dist of stage.distributions) {
               const value = stage.plannedCost * (dist.percentage / 100);
               const dateKey = dist.periodEnd.toISOString().split('T')[0];
               plannedMap.set(dateKey, (plannedMap.get(dateKey) || 0) + value);
            }
         } else {
            // Linear distribution
            const duration = Math.max(1, differenceInDays(stage.endDate, stage.startDate));
            const dailyValue = stage.plannedCost / duration;
            for (let i = 0; i <= duration; i++) {
               const day = addDays(stage.startDate, i).toISOString().split('T')[0];
               plannedMap.set(day, (plannedMap.get(day) || 0) + dailyValue);
            }
         }
      }

      // Calculate Actual Curve (Realizado)
      // 1. Financeiro (AP/AR splits linked to project)
      for (const split of project.financialSplits) {
         if (split.financialEntry.type === 'EXPENSE') {
             // For Actual cost, we consider the competency or paid date
             const date = split.financialEntry.competencyDate || split.financialEntry.paidDate || split.financialEntry.dueDate;
             const dateKey = date.toISOString().split('T')[0];
             actualMap.set(dateKey, (actualMap.get(dateKey) || 0) + split.amount);
         }
      }

      // 2. Estoque (Stock Exits for this project's stages)
      for (const stage of project.stages) {
         for (const mov of stage.stockMovements) {
            // EXIT movements mean material was literally used on site
            const cost = mov.quantity * mov.unitCost;
            const dateKey = mov.createdAt.toISOString().split('T')[0];
            actualMap.set(dateKey, (actualMap.get(dateKey) || 0) + cost);
         }
      }

      // Merge and sort for charting
      const allDates = Array.from(new Set([...plannedMap.keys(), ...actualMap.keys()])).sort();
      const chartData = [];

      for (const date of allDates) {
         totalPlannedAcc += (plannedMap.get(date) || 0);
         totalActualAcc += (actualMap.get(date) || 0);

         chartData.push({
            date,
            planned: Math.round(totalPlannedAcc * 100) / 100,
            actual: Math.round(totalActualAcc * 100) / 100
         });
      }

      return chartData;
    }),

});
