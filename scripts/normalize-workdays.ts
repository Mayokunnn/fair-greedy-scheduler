// scripts/normalize-workdays.ts
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

function normalizeToUTCNoon(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 12, 0, 0, 0))
}

async function normalizeWorkdaysToNoon() {
  const allWorkdays = await prisma.workday.findMany()

  console.log(`🛠️ Normalizing ${allWorkdays.length} workdays...`)

  let updated = 0
  let deleted = 0

  for (const day of allWorkdays) {
    const original = new Date(day.date)
    const normalized = normalizeToUTCNoon(original)

    // Skip if it's already correct
    if (original.getTime() === normalized.getTime()) continue

    const existing = await prisma.workday.findFirst({
      where: { date: normalized },
    })

    if (!existing) {
      await prisma.workday.update({
        where: { id: day.id },
        data: { date: normalized },
      })
      updated++
    } else {
      await prisma.workday.delete({
        where: { id: day.id },
      })
      deleted++
    }
  }

  console.log(`✅ Normalization complete.`)
  console.log(`🔁 Updated: ${updated}, 🗑️ Deleted duplicates: ${deleted}`)

  await prisma.$disconnect()
}

normalizeWorkdaysToNoon().catch((err) => {
  console.error("❌ Failed to normalize workdays:", err)
  prisma.$disconnect()
})
