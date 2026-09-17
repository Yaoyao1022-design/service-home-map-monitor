import type { BoardModel } from '../types'
import { publicUrl } from '../publicUrl'

type Props = {
  board: BoardModel
  onClose: () => void
}

const INSIGHTS: Record<string, { summary: string; risks: string[]; actions: string[] }> = {
  nation: {
    summary: '全国供需整体偏紧，华北、华南部分省份完工压力高于均值。近7天下传单量波动加大，建议优先关注高遗留省份的产能与出勤匹配。',
    risks: ['河北、广东完工率低于全国均值，遗留单量连续 3 日上升。', '周末出勤缺口约 8%，预计影响明日妥投进度。', '高温天气将影响华东部分网格人效，需提前分流。'],
    actions: ['对完工率低于 88% 的省份启动产能支援。', '将未派工剩余单优先调度至出勤充足网格。', '明日 10 点前完成高风险省份的排班复核。'],
  },
  province: {
    summary: '当前省份供需比处于较高区间，城市间差异明显。省会城市单量集中，周边城市产能仍有余量，可做跨城支援。',
    risks: ['核心城市未派工剩余单占比偏高。', '三方出勤波动大于自营，晚高峰运力不稳定。', '明日有降雨预期，体感温度下降，可能拉长单均时效。'],
    actions: ['将省会溢出单量分流至邻近城市。', '提高直营出勤弹性，补齐晚高峰缺口。', '对遗留超过 2 日的工单做专项清零。'],
  },
  city: {
    summary: '本市今日活跃工程师充足，但未派工剩余单仍集中在少数网点。建议按网格就近派单，避免跨区空驶。',
    risks: ['西部、南部网点遗留单高于全市均值。', '已用产能接近阈值，午后可能出现积压。', '部分网格工程师人效偏低，排单不均。'],
    actions: ['优先消化未派工剩余单，限制新单进入高负荷网点。', '将人效较低网格的单量向邻近网格再平衡。', '对产能使用率超 85% 的网点开启预警。'],
  },
  station: {
    summary: '本网点工程师在岗情况良好，完工进度正常。未派工剩余单需在今日完成分配，避免进入隔日遗留。',
    risks: ['未派工剩余单 40 单，集中在空调品类。', '完成率 20%，低于网点目标。', '晚高峰前若不出勤补位，遗留可能继续增加。'],
    actions: ['立即分配未派工单，优先匹配空调技能工程师。', '对好工人标签工程师加大排单权重。', '18 点前复核剩余单，无法完成的及时改约。'],
  },
}

export function AiReportDrawer({ board, onClose }: Props) {
  const pack = INSIGHTS[board.level] ?? INSIGHTS.nation

  return (
    <div className="ai-drawer-root">
      <button className="ai-drawer-mask" type="button" aria-label="关闭智能分析报告" onClick={onClose} />
      <aside className="ai-drawer" aria-label="智能分析报告">
        <div className="ai-drawer-panel">
        <div className="ai-drawer-head">
          <h3>智能分析报告</h3>
          <button className="trend-close" type="button" aria-label="关闭" onClick={onClose}>
            <img src={publicUrl('nav/close-big.svg')} alt="" width={16} height={16} />
          </button>
        </div>
        <div className="ai-drawer-body">
          <div className="ai-report-meta">
            <span className="ai-report-scope">{board.title}</span>
            <span className="muted">基于近 7 天供需数据生成</span>
          </div>
          <section className="ai-report-block">
            <h4>供需概况</h4>
            <p>{pack.summary}</p>
          </section>
          <section className="ai-report-block">
            <h4>风险提示</h4>
            <ul>
              {pack.risks.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
          <section className="ai-report-block">
            <h4>调度建议</h4>
            <ul>
              {pack.actions.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        </div>
      </div>
      </aside>
    </div>
  )
}
