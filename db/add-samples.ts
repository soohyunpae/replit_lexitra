import { db } from "./index";
import * as schema from "@shared/schema";
import { eq } from "drizzle-orm";

/**
 * 샘플 프로젝트와 데이터를 추가하는 스크립트
 */
async function addSamples() {
  try {
    // 기존 사용자 ID 찾기
    const existingUser = await db.query.users.findFirst({
      where: eq(schema.users.username, "soohyun"),
    });

    if (!existingUser) {
      console.log("User 'soohyun' not found. Please create this user first.");
      return;
    }

    const userId = existingUser.id;

    // 특허 샘플 프로젝트들 생성
    const projects = [
      {
        name: "리튬이온 배터리 특허 번역",
        description: "리튬이온 배터리 기술 관련 특허 번역 - 긴급 프로젝트",
        sourceLanguage: "KO",
        targetLanguage: "EN",
        userId,
        status: "Unclaimed" as const,
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 일주일 후
      },
      {
        name: "전기차 충전 시스템 특허",
        description: "전기차 급속 충전 기술에 관한 특허 문서",
        sourceLanguage: "KO",
        targetLanguage: "EN",
        userId,
        status: "Claimed" as const,
        claimedBy: userId,
        claimedAt: new Date(),
        deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 2주 후
      },
      {
        name: "반도체 공정 특허 문서",
        description: "첨단 반도체 제조 공정 관련 특허 문서",
        sourceLanguage: "KO",
        targetLanguage: "EN",
        userId,
        status: "Completed" as const,
        completedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3일 전
        deadline: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1일 전(이미 완료됨)
      }
    ];

    for (const projectData of projects) {
      // 프로젝트 생성
      const [project] = await db.insert(schema.projects)
        .values(projectData)
        .returning();
      
      console.log(`Created project: ${project.name} (ID: ${project.id})`);

      // 프로젝트에 맞는 파일 생성
      let fileContent = "";
      let fileName = "";
      
      if (project.name.includes("리튬이온")) {
        fileName = "lithium_ion_battery_patent.txt";
        fileContent = "리튬이온 배터리는 높은 에너지 밀도와 긴 수명을 가지고 있다.\n" +
                      "본 발명은 리튬이온 배터리의 음극 소재에 관한 것이다.\n" +
                      "이 배터리는 급속 충전 기능을 지원하며 과열 방지 시스템이 포함되어 있다.\n" +
                      "배터리 관리 시스템은 과충전 및 과방전을 방지한다.\n" +
                      "셀 밸런싱 기술을 통해 배터리의 수명을 연장한다.";
      } else if (project.name.includes("전기차")) {
        fileName = "ev_charging_system_patent.txt";
        fileContent = "본 발명은 전기차의 고속 충전 시스템에 관한 것이다.\n" +
                      "충전 효율을 높이기 위해 냉각 시스템이 통합되어 있다.\n" +
                      "사용자는 모바일 애플리케이션을 통해 충전 상태를 확인할 수 있다.\n" +
                      "다양한 전기차 모델에 맞는 어댑터가 제공된다.\n" +
                      "본 기술은 충전 시간을 기존 대비 50% 단축시킨다.";
      } else {
        fileName = "semiconductor_process_patent.txt";
        fileContent = "본 발명은 7nm 이하 미세 공정에 관한 것이다.\n" +
                      "반도체 웨이퍼의 식각 공정 효율을 개선한다.\n" +
                      "절연막 형성 시 새로운 화학 물질을 사용하여 내구성을 향상시킨다.\n" +
                      "대량 생산을 위한 수율 향상 기술이 적용되었다.\n" +
                      "이 공정은 기존 공정 대비 에너지 소비를 20% 감소시킨다.";
      }
      
      // 파일 생성
      const [file] = await db.insert(schema.files)
        .values({
          name: fileName,
          content: fileContent,
          projectId: project.id
        })
        .returning();
      
      console.log(`Created file: ${file.name} for project ${project.id}`);

      // 문장 분리 및 번역 단위 생성
      const sentences = fileContent.split("\n");
      const statuses = ["MT", "Fuzzy", "100%", "Reviewed"];
      
      const segments = sentences.map((sentence, index) => {
        // 번역 상태를 다양하게 설정(완료된 프로젝트는 대부분 Reviewed로)
        const status = project.status === "Completed" 
          ? (Math.random() > 0.3 ? "Reviewed" : statuses[Math.floor(Math.random() * statuses.length)])
          : statuses[Math.floor(Math.random() * statuses.length)];
        
        // 대부분의 세그먼트에 타겟 번역 추가(완료된 프로젝트는 모든 세그먼트에 번역 있음)
        const hasTarget = project.status === "Completed" || Math.random() > 0.3;
        
        return {
          source: sentence,
          target: hasTarget ? generateSampleTranslation(sentence) : "",
          status,
          fileId: file.id
        };
      });
      
      await db.insert(schema.translationUnits).values(segments);
      console.log(`Added ${segments.length} segments to file ${file.id}`);
    }

    // 용어집 추가 항목
    const additionalGlossaryTerms = [
      {
        source: "절연막",
        target: "insulation film",
        sourceLanguage: "KO",
        targetLanguage: "EN"
      },
      {
        source: "리튬이온",
        target: "lithium-ion",
        sourceLanguage: "KO",
        targetLanguage: "EN"
      },
      {
        source: "충전 시스템",
        target: "charging system",
        sourceLanguage: "KO",
        targetLanguage: "EN"
      },
      {
        source: "웨이퍼",
        target: "wafer",
        sourceLanguage: "KO",
        targetLanguage: "EN"
      },
      {
        source: "식각",
        target: "etching",
        sourceLanguage: "KO",
        targetLanguage: "EN"
      }
    ];

    await db.insert(schema.glossary)
      .values(additionalGlossaryTerms)
      .onConflictDoNothing();

    console.log("Additional sample data added successfully!");
  } catch (error) {
    console.error("Error adding sample data:", error);
  }
}

/**
 * 간단한 샘플 번역을 생성합니다.
 */
function generateSampleTranslation(koreanText: string): string {
  // 실제로는 GPT나 다른 번역 서비스를 사용할 수 있지만, 여기서는 간단한 패턴 매칭으로 대체
  if (koreanText.includes("리튬이온 배터리")) {
    return "Lithium-ion batteries have high energy density and long life.";
  } else if (koreanText.includes("음극 소재")) {
    return "This invention relates to the anode material of lithium-ion batteries.";
  } else if (koreanText.includes("급속 충전")) {
    return "This battery supports fast charging and includes an overheating prevention system.";
  } else if (koreanText.includes("배터리 관리")) {
    return "The battery management system prevents overcharging and over-discharging.";
  } else if (koreanText.includes("셀 밸런싱")) {
    return "Cell balancing technology extends the life of the battery.";
  } else if (koreanText.includes("전기차의 고속 충전")) {
    return "This invention relates to the high-speed charging system of electric vehicles.";
  } else if (koreanText.includes("냉각 시스템")) {
    return "A cooling system is integrated to increase charging efficiency.";
  } else if (koreanText.includes("모바일 애플리케이션")) {
    return "Users can check the charging status via a mobile application.";
  } else if (koreanText.includes("어댑터")) {
    return "Adapters are provided for various electric vehicle models.";
  } else if (koreanText.includes("충전 시간")) {
    return "This technology reduces charging time by 50% compared to existing methods.";
  } else if (koreanText.includes("7nm")) {
    return "This invention relates to sub-7nm fine process technology.";
  } else if (koreanText.includes("식각 공정")) {
    return "It improves the etching process efficiency of semiconductor wafers.";
  } else if (koreanText.includes("절연막")) {
    return "Durability is improved by using new chemicals when forming the insulation film.";
  } else if (koreanText.includes("수율 향상")) {
    return "Yield improvement technology for mass production has been applied.";
  } else if (koreanText.includes("에너지 소비")) {
    return "This process reduces energy consumption by 20% compared to existing processes.";
  } else {
    // 기본 응답
    return "The present invention provides an improved method for the technology.";
  }
}

addSamples();
