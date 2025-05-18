export interface Resources {
  translation: {
    // Common elements
    common: {
      home: string;
      projects: string;
      glossaries: string;
      tm: string; // Translation Memory
      profile: string;
      admin: string;
      login: string;
      logout: string;
      myAccount: string;
      myProfile: string;
      darkMode: string;
      lightMode: string;
      save: string;
      cancel: string;
      search: string;
      loading: string;
      error: string;
      success: string;
      noData: string;
      create: string;
      edit: string;
      delete: string;
      back: string;
      next: string;
      confirm: string;
    };
    
    // Auth related
    auth: {
      login: string;
      signup: string;
      email: string;
      password: string;
      username: string;
      forgotPassword: string;
      resetPassword: string;
      loginError: string;
      logoutSuccess: string;
    };
    
    // Dashboard related
    dashboard: {
      title: string;
      welcomeMessage: string;
      recentProjects: string;
      statistics: string;
      translationProgress: string;
      projectsCompleted: string;
      pendingTasks: string;
    };
    
    // Projects related
    projects: {
      title: string;
      createProject: string;
      projectName: string;
      projectDescription: string;
      sourceLanguage: string;
      targetLanguage: string;
      status: string;
      progress: string;
      deadline: string;
      actions: string;
      noProjects: string;
      filterProjects: string;
      details: string;
      files: string;
      addFile: string;
      removeFile: string;
      projectCreated: string;
      projectUpdated: string;
      projectDeleted: string;
    };
    
    // Translation editor related
    translation: {
      editor: string;
      source: string;
      target: string;
      suggestions: string;
      history: string;
      comments: string;
      addComment: string;
      saveTranslation: string;
      confirm: string;
      reject: string;
      previous: string;
      next: string;
      segment: string;
      searchInProject: string;
      findAndReplace: string;
      translationSaved: string;
      translationError: string;
      segmentUpdated: string;
    };
    
    // Glossary related
    glossary: {
      title: string;
      createGlossary: string;
      glossaryName: string;
      glossaryDescription: string;
      sourceLanguage: string;
      targetLanguage: string;
      entries: string;
      noGlossaries: string;
      addEntry: string;
      sourceText: string;
      targetText: string;
      context: string;
      entryAdded: string;
      entryUpdated: string;
      entryDeleted: string;
      importGlossary: string;
      exportGlossary: string;
    };
    
    // TM (Translation Memory) related
    tm: {
      title: string;
      entries: string;
      createEntry: string;
      sourceText: string;
      targetText: string;
      similarity: string;
      dateAdded: string;
      addedBy: string;
      noEntries: string;
      importTM: string;
      exportTM: string;
      alignment: string;
      cleanup: string;
    };
    
    // Profile related
    profile: {
      title: string;
      personalInfo: string;
      username: string;
      email: string;
      role: string;
      updateProfile: string;
      changePassword: string;
      currentPassword: string;
      newPassword: string;
      confirmPassword: string;
      passwordChanged: string;
      profileUpdated: string;
      preferences: string;
      language: string;
    };
    
    // Admin related
    admin: {
      title: string;
      users: string;
      projects: string;
      settings: string;
      createUser: string;
      editUser: string;
      deleteUser: string;
      userManagement: string;
      projectManagement: string;
      systemSettings: string;
      roles: string;
      permissions: string;
      activityLogs: string;
      fileProcessing: string;
      tmManagement: string;
      glossaryManagement: string;
    };
    
    // Language names
    languages: {
      en: string;
      ko: string;
      // Add more languages as needed
    };
  };
}