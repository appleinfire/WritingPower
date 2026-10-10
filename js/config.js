// Everything that names this app. Change these values first when starting a new app from the template.
(function () {
  const APP = (globalThis.APP = globalThis.APP || {});
  APP.CONFIG = {
    name: 'WritingPower',
    // Storage prefix and family-key salt. Never change it after launch:
    // a new id means every device starts empty and families can no longer be found.
    id: 'writing-power',
    // What one profile is called in the interface.
    profileWord: 'writer',
    // Profile kinds are school grades. Each profile starts in its grade; a grown-up can switch it.
    kinds: [
      { id: 'k', label: 'Kindergarten', icon: '🐣', color: '#ff8fab', about: 'Short words like cat, sun, big' },
      { id: 'g1', label: 'First grade', icon: '🌱', color: '#57c26a', about: 'Sight words and blends' },
      { id: 'g2', label: 'Second grade', icon: '🚀', color: '#4aa8e8', about: 'Longer sentences, two-syllable words' },
      { id: 'g3', label: 'Third grade', icon: '🦉', color: '#9b7fd4', about: 'Big words and tricky spellings' },
    ],
    avatars: ['🦊', '🐼', '🐸', '🦉', '🐯', '🐙', '🦄', '🐢'],
    // Firebase project of Math Expedition (shared; data is separated by the family key, which is salted with `id`).
    // These values identify the project; they are not secrets. null = no cloud sync.
    firebase: {
      apiKey: 'AIzaSyAn0Pl1zrsT_OWZSfzgjnFHjAv4RTZowgI',
      authDomain: 'math-accc7.firebaseapp.com',
      projectId: 'math-accc7',
      storageBucket: 'math-accc7.firebasestorage.app',
      messagingSenderId: '932850319929',
      appId: '1:932850319929:web:0e1393157b84030f0b83e8',
    },
  };
})();
