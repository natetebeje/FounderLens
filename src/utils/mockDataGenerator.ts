/**
 * Production-ready mock data generator with realistic variations
 */

interface MockUser {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: string;
  lastActive: string;
}

interface MockOpportunity {
  id: string;
  title: string;
  description: string;
  score: number;
  source: string;
  category: string;
  engagement: number;
  difficulty: string;
  timeframe: string;
  tags: string[];
}

interface MockMetric {
  name: string;
  value: number;
  change: number;
  trend: 'up' | 'down' | 'stable';
  formatted: string;
}

const mockNames = [
  'Alex Thompson', 'Sarah Chen', 'Marcus Johnson', 'Elena Rodriguez', 'David Kim',
  'Rachel Green', 'Michael Brown', 'Lisa Wang', 'James Wilson', 'Anna Miller'
];

const mockCompanies = [
  'TechCorp', 'InnovateLabs', 'DataDriven Inc', 'CloudFirst', 'NextGen Solutions',
  'StartupHub', 'ScaleUp Co', 'DevTools Inc', 'GrowthTech', 'FutureSoft'
];

const mockCategories = [
  'SaaS', 'E-commerce', 'FinTech', 'HealthTech', 'EdTech', 
  'Marketing', 'Productivity', 'Analytics', 'Security', 'AI/ML'
];

const mockTags = [
  'high-priority', 'urgent', 'validated', 'trending', 'untapped',
  'competitive', 'niche', 'mass-market', 'b2b', 'b2c'
];

export class MockDataGenerator {
  private static instance: MockDataGenerator;
  private readonly isDevelopment = import.meta.env.DEV;

  static getInstance(): MockDataGenerator {
    if (!MockDataGenerator.instance) {
      MockDataGenerator.instance = new MockDataGenerator();
    }
    return MockDataGenerator.instance;
  }

  private getRandomElement<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }

  private getRandomNumber(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private getRandomDate(daysAgo: number = 30): string {
    const date = new Date();
    date.setDate(date.getDate() - this.getRandomNumber(0, daysAgo));
    return date.toISOString().split('T')[0];
  }

  generateUsers(count: number = 10): MockUser[] {
    if (!this.isDevelopment) {
      return []; // Return empty in production unless specifically needed
    }

    return Array.from({ length: count }, (_, i) => ({
      id: `user-${i + 1}`,
      name: this.getRandomElement(mockNames),
      email: `user${i + 1}@${this.getRandomElement(mockCompanies).toLowerCase()}.com`,
      avatar: `https://images.unsplash.com/photo-${1500000000000 + i}?w=64&h=64&fit=crop&crop=face`,
      role: this.getRandomElement(['Admin', 'Manager', 'User', 'Analyst']),
      lastActive: this.getRandomDate(7)
    }));
  }

  generateOpportunities(count: number = 6): MockOpportunity[] {
    const opportunities: MockOpportunity[] = [];
    
    for (let i = 0; i < count; i++) {
      const category = this.getRandomElement(mockCategories);
      const difficulty = this.getRandomElement(['Easy', 'Medium', 'Hard']);
      const timeframe = this.getRandomElement(['1-2 weeks', '2-4 weeks', '1-2 months', '3+ months']);
      
      opportunities.push({
        id: `opp-${i + 1}`,
        title: `${category} Market Opportunity ${i + 1}`,
        description: `Identified ${category.toLowerCase()} opportunity with ${this.getRandomNumber(60, 95)}% market validation. This represents a ${difficulty.toLowerCase()} implementation with ${timeframe} estimated delivery.`,
        score: this.getRandomNumber(65, 98),
        source: this.getRandomElement(['Reddit', 'Twitter', 'LinkedIn', 'Industry Report', 'Survey']),
        category,
        engagement: this.getRandomNumber(100, 5000),
        difficulty,
        timeframe,
        tags: Array.from(
          { length: this.getRandomNumber(2, 4) }, 
          () => this.getRandomElement(mockTags)
        ).filter((tag, index, array) => array.indexOf(tag) === index)
      });
    }
    
    return opportunities.sort((a, b) => b.score - a.score);
  }

  generateMetrics(): MockMetric[] {
    const baseMetrics = [
      { name: 'Total Users', base: 12500, changeRange: [-5, 15] },
      { name: 'Revenue', base: 45000, changeRange: [-8, 22] },
      { name: 'Conversion Rate', base: 3.2, changeRange: [-0.5, 1.2] },
      { name: 'Active Sessions', base: 2847, changeRange: [-10, 25] }
    ];

    return baseMetrics.map(metric => {
      const change = this.getRandomNumber(metric.changeRange[0] * 10, metric.changeRange[1] * 10) / 10;
      const trend = change > 5 ? 'up' : change < -5 ? 'down' : 'stable';
      const value = metric.base + Math.round(metric.base * (change / 100));
      
      return {
        name: metric.name,
        value,
        change,
        trend,
        formatted: metric.name === 'Revenue' 
          ? `$${(value / 1000).toFixed(1)}k`
          : metric.name === 'Conversion Rate'
          ? `${value.toFixed(1)}%`
          : value.toLocaleString()
      };
    });
  }

  async simulateAsyncLoad<T>(
    data: T, 
    minDelay: number = 800, 
    maxDelay: number = 2000,
    failureRate: number = 0.02
  ): Promise<T> {
    const delay = this.getRandomNumber(minDelay, maxDelay);
    
    await new Promise(resolve => setTimeout(resolve, delay));
    
    // Simulate occasional failures in development
    if (this.isDevelopment && Math.random() < failureRate) {
      throw new Error('Simulated network error for testing');
    }
    
    return data;
  }

  // Environment-specific behavior
  getLoadingDelay(): number {
    return this.isDevelopment ? this.getRandomNumber(500, 1500) : 0;
  }

  shouldShowMockData(): boolean {
    return this.isDevelopment || import.meta.env.VITE_ENABLE_MOCK_DATA === 'true';
  }
}

export const mockDataGenerator = MockDataGenerator.getInstance();