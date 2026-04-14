import { Heart, Sparkles, MapPin, Camera, Clock, Star, Activity } from 'lucide-react';

export const SEGMENTS = {
  general: {
    key: 'general',
    tagline: '⏱️ Time Tracking for Every Moment',
    title: 'Every Moment Matters',
    subtitle: 'Track any event that matters to you. Whether it’s fitness goals, sobriety, project deadlines, or pet growth—TinyTag helps you preserve every milestone.',
    steps: [
      { icon: Clock, title: '1. Set Your Goal', desc: "Add any date or milestone you want to track in the sidebar." },
      { icon: Camera, title: '2. Batch Edit Photos', desc: 'Select any photos. We’ll automatically calculate the time since your goal.' },
      { icon: Activity, title: '3. Celebrate Progress', desc: 'Save and share your journey with beautiful, data-rich photo tags.' }
    ],
    primaryColor: '#0891b2',
    primaryDark: '#0e7490',
    primaryLight: '#ecfeff',
    sampleTag: {
      name: "My Big Goal 🚀",
      type: 'countup',
      date: '2024-01-01',
      time: '00:00',
      format: 'd',
      prefix: 'Day',
      label: ''
    },
    demoImage: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&q=80&w=1200'
  },
  baby: {
    key: 'baby',
    tagline: '✨ Milestone & Age Tracker for Parents',
    title: 'Preserve Every Tiny Moment',
    subtitle: 'Automatically calculate ages, track milestones, and add beautiful countdowns to your photos. The perfect batch editor for parenting memories.',
    steps: [
      { icon: Sparkles, title: '1. Create Milestones', desc: "Add birth dates or special events like 'First Steps' in the sidebar." },
      { icon: Camera, title: '2. Select Photos', desc: 'Upload your favorite baby snaps. We support high-quality batch editing.' },
      { icon: Star, title: '3. Save Memories', desc: 'Overlay growth milestones and age tags instantly.' }
    ],
    primaryColor: '#FF6B9D',
    primaryDark: '#EE1D71',
    primaryLight: '#FFF0F5',
    sampleTag: {
      name: "Baby's Arrival 👶",
      type: 'countup',
      date: '2023-12-25',
      time: '08:30',
      format: 'y-m-d',
      prefix: 'Age:',
      label: 'old'
    },
    demoImage: 'https://images.unsplash.com/photo-1519689680058-324335c77eba?auto=format&fit=crop&q=80&w=1200'
  },
  love: {
    key: 'love',
    tagline: '💖 For Couples: Celebrate Your Journey',
    title: 'Every Day in Love Counts',
    subtitle: 'Track how long you’ve been together, count down to your wedding, or mark special anniversaries on your favorite couple photos.',
    steps: [
      { icon: Heart, title: '1. Mark Your Date', desc: "Add your anniversary or wedding date to start the timer." },
      { icon: Camera, title: '2. Pick Your Best Moments', desc: 'Select photos of you together. Batch add "Days in Love" tags.' },
      { icon: Clock, title: '3. Share the Love', desc: 'Save beautiful marked memories and share them with your partner.' }
    ],
    primaryColor: '#e03131',
    primaryDark: '#c92a2a',
    primaryLight: '#fff5f5',
    sampleTag: {
      name: "Our Anniversary ❤️",
      type: 'countup',
      date: '2022-06-14',
      time: '18:00',
      format: 'y-m-d',
      prefix: 'Together for',
      label: ''
    },
    demoImage: 'https://images.unsplash.com/photo-1516589174184-c68526514ec0?auto=format&fit=crop&q=80&w=1200'
  },
  travel: {
    key: 'travel',
    tagline: '✈️ Adventure is Calling',
    title: 'Mark Every Mile & Moment',
    subtitle: 'Count down to your next flight, timestamp your vacation photos with locations, and track the days spent exploring the world.',
    steps: [
      { icon: MapPin, title: '1. Add Destinations', desc: 'Set your flight dates or arrival times for upcoming trips.' },
      { icon: Camera, title: '2. Group Your Photos', desc: 'Import your travel snaps. We automatically read EXIF location data.' },
      { icon: Sparkles, title: '3. Relive the Trip', desc: 'Overlay "Days since landing" or destination tags instantly.' }
    ],
    primaryColor: '#1c7ed6',
    primaryDark: '#1864ab',
    primaryLight: '#e7f5ff',
    sampleTag: {
      name: "Europe Trip 🇪🇺",
      type: 'countdown',
      date: '2024-12-01',
      time: '09:00',
      format: 'd-h-m',
      prefix: 'Departure in',
      label: ''
    },
    demoImage: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&q=80&w=1200'
  }
};
