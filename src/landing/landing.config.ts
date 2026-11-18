export interface CrewMember {
  name: string;
  url: string;
  role?: string;
}

export interface SourceRepo {
  platform: string;
  repo: string;
  url: string;
}

export interface VizmaConfig {
  title: string;
  description: string;
  url: string;
  isLive: boolean;
  buttonText: string;
}

export interface ReferenceItem {
  title: string;
  description: string;
  url: string;
}

export interface LandingConfig {
  title: string;
  tagline: string;
  buttons: {
    play: {
      label: string;
      continueLabel: string;
      newGameLabel: string;
    };
    about: {
      id: "about";
      label: string;
      icon: "people";
    };
    visualisations: {
      id: "visualisations";
      label: string;
      icon: "sparkles";
    };
    references: {
      id: "references";
      label: string;
      icon: "book";
    };
  };
  popups: {
    about: {
      title: string;
      description: string;
      crew: CrewMember[];
      source: SourceRepo;
    };
    visualisations: {
      title: string;
      vizma: VizmaConfig;
    };
    references: {
      title: string;
      items: ReferenceItem[];
    };
  };
}

export const landingConfig: LandingConfig = {
  title: "NEURO-SCRAP",
  tagline: "",
  buttons: {
    play: {
      label: "PLAY GAME",
      continueLabel: "PLAY GAME",
      newGameLabel: "",
    },
    about: {
      id: "about",
      label: "ABOUT US & CREW",
      icon: "people",
    },
    visualisations: {
      id: "visualisations",
      label: "MORE VISUALISATIONS",
      icon: "sparkles",
    },
    references: {
      id: "references",
      label: "REFERENCES & FOUNDATIONS",
      icon: "book",
    },
  },
  popups: {
    about: {
      title: "ABOUT US & CREW",
      description:
        "NEURO-SCRAP is a first-person sci-fi game that teaches data science and how neural networks learn, by repairing a crashed robot's brain.",
      crew: [
        {
          name: "Mukund Shah",
          url: "https://www.linkedin.com/in/mukund-shah-7b5645241",
          role: "",
        },
        {
          name: "Arunoday Gupta",
          url: "https://www.linkedin.com/in/arunoday-gupta-754140343/",
          role: "",
        },
        {
          name: "Aditya Singh",
          url: "https://www.linkedin.com/in/aditya-singh-b227a5319/",
          role: "",
        },
      ],
      source: {
        platform: "GitHub",
        repo: "MagnusKalicharan/neuroscrap",
        url: "https://github.com/MagnusKalicharan/neuroscrap.git",
      },
    },
    visualisations: {
      title: "MORE VISUALISATIONS",
      vizma: {
        title: "Vizma",
        description:
          "Vizma is an interactive, visual physics and mathematics learning platform designed to make abstract and dynamic concepts intuitive through real-time simulations and rigorous mathematical derivations.",
        url: "https://vizma.onrender.com/",
        isLive: true,
        buttonText: "OPEN VIZMA",
      },
    },
    references: {
      title: "REFERENCES & FOUNDATIONS",
      items: [
        {
          title: "TensorFlow Playground",
          description:
            "Build and train a small neural network in your browser and watch it learn.",
          url: "https://playground.tensorflow.org/",
        },
        {
          title: "3Blue1Brown",
          description:
            "A visual video introduction to how neural networks learn.",
          url: "https://www.3blue1brown.com/topics/neural-networks",
        },
      ],
    },
  },
};
