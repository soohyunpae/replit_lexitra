import { db } from "./index";
import * as schema from "@shared/schema";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function seed() {
  try {
    // Create test users with appropriate roles
    const testUsers = [
      {
        username: "admin",
        password: await hashPassword("admin123"),
        role: "admin"
      },
      {
        username: "test",
        password: await hashPassword("password"),
        role: "user"
      }
    ];

    // Insert users and handle conflicts
    const [user] = await db.insert(schema.users)
      .values(testUsers)
      .returning()
      .onConflictDoNothing();

    if (!user) {
      console.log("Users already exist, skipping user creation...");
      
      // Fetch an existing user for creating sample projects
      const existingUser = await db.query.users.findFirst();
      if (!existingUser) {
        console.log("No users found in database. Cannot create sample data.");
        return;
      }
      
      // Use the existing user for further seeding
      return seedSampleData(existingUser.id);
    }
    
    // If we created new users, seed the sample data with the first user's ID
    return seedSampleData(user.id);
  } catch (error) {
    console.error("Error seeding database:", error);
  }
}

async function seedSampleData(userId: number) {
  try {
    // Create TM resources
    const tmResources = [
      {
        name: "Default TM",
        description: "Default Translation Memory for all projects",
        defaultSourceLanguage: "KO",
        defaultTargetLanguage: "EN",
        isActive: true
      },
      {
        name: "Patent TM",
        description: "Translation Memory for patent documents",
        domain: "Patents",
        defaultSourceLanguage: "KO",
        defaultTargetLanguage: "EN",
        isActive: true
      },
      {
        name: "Legal TM",
        description: "Translation Memory for legal documents",
        domain: "Legal",
        defaultSourceLanguage: "KO",
        defaultTargetLanguage: "EN",
        isActive: true
      }
    ];

    // Insert TM resources and handle conflicts
    for (const resource of tmResources) {
      await db.insert(schema.tmResources)
        .values(resource)
        .onConflictDoNothing();
    }

    // Create TB resources
    const tbResources = [
      {
        name: "Default TB",
        description: "Default Terminology Base for all projects",
        defaultSourceLanguage: "KO",
        defaultTargetLanguage: "EN",
        isActive: true
      },
      {
        name: "Patent TB",
        description: "Terminology Base for patent documents",
        domain: "Patents",
        defaultSourceLanguage: "KO",
        defaultTargetLanguage: "EN",
        isActive: true
      },
      {
        name: "Electronics TB",
        description: "Terminology Base for electronics documents",
        domain: "Electronics",
        defaultSourceLanguage: "KO",
        defaultTargetLanguage: "EN",
        isActive: true
      }
    ];

    // Insert TB resources and handle conflicts
    for (const resource of tbResources) {
      await db.insert(schema.tbResources)
        .values(resource)
        .onConflictDoNothing();
    }

    // Create a demo project
    const [project] = await db.insert(schema.projects)
      .values({
        name: "Patent Translation Project",
        description: "Korean to English patent translation",
        sourceLanguage: "KO",
        targetLanguage: "EN",
        userId: userId
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

    // Get the created TM resources
    const [defaultTm, patentTm, legalTm] = await db.query.tmResources.findMany();

    // Get the created TB resources
    const [defaultTb, patentTb, electronicsTb] = await db.query.tbResources.findMany();

    // Add sample translation memory entries
    const tmEntries = [
      {
        source: "기계는 신뢰성 있게 작동해야 한다.",
        target: "The machine must operate reliably.",
        status: "Reviewed",
        sourceLanguage: "KO",
        targetLanguage: "EN",
        resourceId: defaultTm?.id || 1
      },
      {
        source: "기계는 고온 환경에서도 작동해야 한다.",
        target: "The machine must operate in high-temperature environments.",
        status: "Reviewed",
        sourceLanguage: "KO",
        targetLanguage: "EN",
        resourceId: patentTm?.id || 1
      },
      {
        source: "본 발명의 장치는 충전식 배터리로 작동하며 최소 8시간동안 사용할 수 있다.",
        target: "The device of the present invention operates on a rechargeable battery and can be used for a minimum of 8 hours.",
        status: "Reviewed",
        sourceLanguage: "KO",
        targetLanguage: "EN",
        resourceId: patentTm?.id || 1
      },
      {
        source: "법적 통지는 계약 서명 전에 제공되어야 한다.",
        target: "Legal notices must be provided before contract signing.",
        status: "Reviewed",
        sourceLanguage: "KO",
        targetLanguage: "EN",
        resourceId: legalTm?.id || 1
      }
    ];

    await db.insert(schema.translationMemory).values(tmEntries);

    // Add glossary terms
    const glossaryTerms = [
      {
        source: "기계",
        target: "machine",
        sourceLanguage: "KO",
        targetLanguage: "EN",
        resourceId: defaultTb?.id || 1
      },
      {
        source: "장치",
        target: "device",
        sourceLanguage: "KO",
        targetLanguage: "EN",
        resourceId: defaultTb?.id || 1
      },
      {
        source: "신뢰성",
        target: "reliability",
        sourceLanguage: "KO",
        targetLanguage: "EN",
        resourceId: defaultTb?.id || 1
      },
      {
        source: "반도체",
        target: "semiconductor",
        sourceLanguage: "KO",
        targetLanguage: "EN",
        resourceId: patentTb?.id || 1
      },
      {
        source: "집적회로",
        target: "integrated circuit",
        sourceLanguage: "KO",
        targetLanguage: "EN",
        resourceId: electronicsTb?.id || 1,
        domain: "Electronics"
      },
      {
        source: "트랜지스터",
        target: "transistor",
        sourceLanguage: "KO",
        targetLanguage: "EN",
        resourceId: electronicsTb?.id || 1,
        domain: "Electronics"
      }
    ];

    await db.insert(schema.glossary).values(glossaryTerms);

    console.log("Database seeded successfully!");
  } catch (error) {
    console.error("Error seeding database:", error);
  }
}

seed();
