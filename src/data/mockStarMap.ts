import type { StarMapData } from '../types'

/**
 * Mock star map data for "经济学入门".
 * bookIds use placeholder keys resolved at runtime by resolveMockBookIds().
 */

const MOCK_MAPS: Record<string, StarMapData> = {
  '经济学入门': {
    topicName: '经济学入门',
    topicId: 'mock-econ',
    categories: [
      {
        name: '宏观经济学',
        color: '#3D7C98',
        nodes: [
          {
            id: 'macro-1',
            name: 'GDP与经济增长',
            description: 'GDP（国内生产总值）衡量一个国家在一定时期内生产的所有最终商品和服务的总价值，是判断经济景气程度的核心指标。',
            categoryIndex: 0,
            bookIds: [],
            recommendedBook: { title: '经济学原理（宏观）', author: '曼昆' },
          },
          {
            id: 'macro-2',
            name: '通货膨胀',
            description: '通货膨胀是指一般物价水平持续上涨，导致货币购买力下降的经济现象。适度的通胀被视为经济健康的信号。',
            categoryIndex: 0,
            bookIds: [],
            recommendedBook: { title: '自由选择', author: '米尔顿·弗里德曼' },
          },
          {
            id: 'macro-3',
            name: '货币政策',
            description: '中央银行通过调节利率、公开市场操作和存款准备金率等工具来影响货币供给和信贷条件，从而实现物价稳定和充分就业。',
            categoryIndex: 0,
            bookIds: [],
            recommendedBook: { title: '货币金融学', author: '米什金' },
          },
          {
            id: 'macro-4',
            name: '财政政策',
            description: '政府通过税收和支出计划来影响总需求，以实现经济增长、就业和物价稳定等宏观经济目标。',
            categoryIndex: 0,
            bookIds: [],
            recommendedBook: { title: '国家的常识', author: '罗斯金' },
          },
        ],
      },
      {
        name: '微观经济学',
        color: '#E8654A',
        nodes: [
          {
            id: 'micro-1',
            name: '供需关系',
            description: '供给和需求是市场经济的基石。价格在供给曲线和需求曲线的交点处达到均衡，任何一方的变动都会引发新的均衡。',
            categoryIndex: 1,
            bookIds: ['book-milk'],
            recommendedBook: { title: '经济学原理（微观）', author: '曼昆' },
          },
          {
            id: 'micro-2',
            name: '沉没成本',
            description: '已经发生且无法收回的成本。理性的决策者应当忽略沉没成本，只关注未来的边际收益和边际成本。',
            categoryIndex: 1,
            bookIds: ['book-milk'],
            recommendedBook: { title: '思考，快与慢', author: '丹尼尔·卡尼曼' },
          },
          {
            id: 'micro-3',
            name: '边际效用',
            description: '每多消费一单位商品所带来的额外满足感。边际效用递减规律解释了为什么人们不会无限地消费同一种商品。',
            categoryIndex: 1,
            bookIds: [],
            recommendedBook: { title: '国富论', author: '亚当·斯密' },
          },
          {
            id: 'micro-4',
            name: '机会成本',
            description: '做出一个选择时所放弃的最佳替代选项的价值。理解机会成本是进行理性经济决策的第一步。',
            categoryIndex: 1,
            bookIds: [],
            recommendedBook: { title: '魔鬼经济学', author: '列维特' },
          },
          {
            id: 'micro-5',
            name: '价格弹性',
            description: '衡量需求量或供给量对价格变化的敏感程度。弹性大的商品，价格微调就能引起销量的大幅波动。',
            categoryIndex: 1,
            bookIds: [],
            recommendedBook: { title: '牛奶可乐经济学', author: '罗伯特·弗兰克' },
          },
        ],
      },
      {
        name: '行为经济学',
        color: '#9B5DE5',
        nodes: [
          {
            id: 'behav-1',
            name: '损失厌恶',
            description: '人们对损失的痛苦感远强于同等收益带来的快乐感。失去100元的痛苦大约是获得100元快乐的2倍。',
            categoryIndex: 2,
            bookIds: [],
            recommendedBook: { title: '思考，快与慢', author: '丹尼尔·卡尼曼' },
          },
          {
            id: 'behav-2',
            name: '心理账户',
            description: '人们会在心里将钱分到不同的"账户"中，对不同来源的钱采取不同的消费态度，即使它们的实际价值完全相同。',
            categoryIndex: 2,
            bookIds: [],
            recommendedBook: { title: '助推', author: '理查德·泰勒' },
          },
          {
            id: 'behav-3',
            name: '锚定效应',
            description: '人们在做数值估计时，会过度依赖最先接收到的信息（锚点），即使这个锚点与判断无关。',
            categoryIndex: 2,
            bookIds: [],
            recommendedBook: { title: '怪诞行为学', author: '丹·艾瑞里' },
          },
          {
            id: 'behav-4',
            name: '禀赋效应',
            description: '人们倾向于高估自己已经拥有的物品的价值，仅仅因为"拥有"本身就赋予了额外的心理价值。',
            categoryIndex: 2,
            bookIds: [],
            recommendedBook: { title: '思考，快与慢', author: '丹尼尔·卡尼曼' },
          },
        ],
      },
      {
        name: '制度经济学',
        color: '#5B9E6F',
        nodes: [
          {
            id: 'inst-1',
            name: '产权理论',
            description: '清晰的产权界定是市场高效运作的前提。当产权不明晰时，会出现"公地悲剧"——资源被过度使用而无人维护。',
            categoryIndex: 3,
            bookIds: [],
            recommendedBook: { title: '制度、制度变迁与经济绩效', author: '道格拉斯·诺斯' },
          },
          {
            id: 'inst-2',
            name: '交易成本',
            description: '完成一笔交易所需的全部成本，包括搜索信息、谈判、签约和监督执行的费用。制度的存在就是为了降低交易成本。',
            categoryIndex: 3,
            bookIds: [],
            recommendedBook: { title: '企业的性质', author: '科斯' },
          },
          {
            id: 'inst-3',
            name: '公共物品',
            description: '具有非排他性和非竞争性的商品，如国防、灯塔。由于无法排除不付费者使用，市场往往供给不足。',
            categoryIndex: 3,
            bookIds: [],
            recommendedBook: { title: '经济学原理', author: '曼昆' },
          },
          {
            id: 'inst-4',
            name: '制度变迁',
            description: '制度会随着技术和偏好的变化而演进。成功的制度变迁能释放经济活力，而路径依赖可能导致制度锁定在低效状态。',
            categoryIndex: 3,
            bookIds: [],
            recommendedBook: { title: '国家为什么会失败', author: '阿西莫格鲁' },
          },
        ],
      },
    ],
  },
}

/** Lookup mock star map by topic name (exact match) */
export function getMockStarMapData(topicName: string): StarMapData | null {
  return MOCK_MAPS[topicName] ?? null
}

/**
 * Resolve mock placeholder bookIds (e.g. 'book-milk') to real book IDs
 * based on title substring match. Returns a map of mockId → realBookId.
 */
const MOCK_BOOK_NAMES: Record<string, string> = {
  'book-milk': '牛奶可乐经济学',
}

export function resolveMockBookIds(
  booksInTopic: Array<{ id: string; title: string }>
): Map<string, string> {
  const result = new Map<string, string>()
  for (const [mockId, titleKeyword] of Object.entries(MOCK_BOOK_NAMES)) {
    const match = booksInTopic.find((b) => b.title.includes(titleKeyword))
    if (match) result.set(mockId, match.id)
  }
  return result
}
