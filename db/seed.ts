import { db } from "./index";
import * as schema from "@shared/schema";

async function seed() {
  try {
    // Create a demo user
    const [user] = await db.insert(schema.users)
      .values({
        username: "demo",
        password: "password" // In production, this would be hashed
      })
      .returning()
      .onConflictDoNothing();

    if (!user) {
      console.log("User already exists, skipping...");
      return;
    }

    // Create a demo project
    const [project] = await db.insert(schema.projects)
      .values({
        name: "Patent Translation Project",
        description: "Korean to English patent translation",
        sourceLanguage: "KO",
        targetLanguage: "EN",
        userId: user.id
      })
      .returning();

    // Create a sample file
    const [file] = await db.insert(schema.files)
      .values({
        name: "patent_2023_JP-01.txt",
        content: "기계는 빠르고 신뢰성 있게 작동해야 한다.\n이 장치는 고온 및 저온 환경에서도 작동할 수 있어야 한다.\n본 발명은 새로운 유형의 반도체 장치에 관한 것이다.\n이 장치는 동작 상태를 표시하는 LED 인디케이터를 포함한다.\n본 발명의 장치는 배터리로 작동할 수 있으며 최소 8시간의 배터리 수명을 갖는다.",
        projectId: project.id
      })
      .returning();

    // Create translation units from the file content
    const segments = [
      {
        source: "기계는 빠르고 신뢰성 있게 작동해야 한다.",
        target: "The machine must operate quickly and reliably.",
        status: "100%",
        fileId: file.id
      },
      {
        source: "이 장치는 고온 및 저온 환경에서도 작동할 수 있어야 한다.",
        target: "This device must be capable of operating in both high-temperature and low-temperature environments.",
        status: "Reviewed",
        fileId: file.id
      },
      {
        source: "본 발명은 새로운 유형의 반도체 장치에 관한 것이다.",
        target: "The present invention relates to a new type of semiconductor device.",
        status: "MT",
        fileId: file.id
      },
      {
        source: "이 장치는 동작 상태를 표시하는 LED 인디케이터를 포함한다.",
        target: "This device includes an LED indicator that displays the operational status.",
        status: "Fuzzy",
        fileId: file.id
      },
      {
        source: "본 발명의 장치는 배터리로 작동할 수 있으며 최소 8시간의 배터리 수명을 갖는다.",
        target: "",
        status: "MT",
        fileId: file.id
      }
    ];

    await db.insert(schema.translationUnits).values(segments);

    // Add sample translation memory entries
    const tmEntries = [
      {
        source: "기계는 신뢰성 있게 작동해야 한다.",
        target: "The machine must operate reliably.",
        status: "Reviewed",
        sourceLanguage: "KO",
        targetLanguage: "EN"
      },
      {
        source: "기계는 고온 환경에서도 작동해야 한다.",
        target: "The machine must operate in high-temperature environments.",
        status: "Reviewed",
        sourceLanguage: "KO",
        targetLanguage: "EN"
      },
      {
        source: "본 발명의 장치는 충전식 배터리로 작동하며 최소 8시간동안 사용할 수 있다.",
        target: "The device of the present invention operates on a rechargeable battery and can be used for a minimum of 8 hours.",
        status: "Reviewed",
        sourceLanguage: "KO",
        targetLanguage: "EN"
      }
    ];

    await db.insert(schema.translationMemory).values(tmEntries);

    // Add glossary terms
    const glossaryTerms = [
      {
        source: "기계",
        target: "machine",
        sourceLanguage: "KO",
        targetLanguage: "EN"
      },
      {
        source: "장치",
        target: "device",
        sourceLanguage: "KO",
        targetLanguage: "EN"
      },
      {
        source: "신뢰성",
        target: "reliability",
        sourceLanguage: "KO",
        targetLanguage: "EN"
      },
      {
        source: "반도체",
        target: "semiconductor",
        sourceLanguage: "KO",
        targetLanguage: "EN"
      }
    ];

    await db.insert(schema.glossary).values(glossaryTerms);

    console.log("Database seeded successfully!");
  } catch (error) {
    console.error("Error seeding database:", error);
  }
}

seed();
