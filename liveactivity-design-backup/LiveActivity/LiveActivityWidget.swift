import ActivityKit
import SwiftUI
import WidgetKit

struct LiveActivityAttributes: ActivityAttributes {
  struct ContentState: Codable, Hashable {
    var title: String
    var subtitle: String?
    var timerEndDateInMilliseconds: Double?
    var progress: Double?
    var imageName: String?
    var dynamicIslandImageName: String?
  }

  var name: String
  var backgroundColor: String?
  var titleColor: String?
  var subtitleColor: String?
  var progressViewTint: String?
  var progressViewLabelColor: String?
  var deepLinkUrl: String?
  var timerType: DynamicIslandTimerType?
  var padding: Int?
  var paddingDetails: PaddingDetails?
  var imagePosition: String?
  var imageWidth: Int?
  var imageHeight: Int?
  var imageWidthPercent: Double?
  var imageHeightPercent: Double?
  var imageAlign: String?
  var contentFit: String?

  enum DynamicIslandTimerType: String, Codable {
    case circular
    case digital
  }

  struct PaddingDetails: Codable, Hashable {
    var top: Int?
    var bottom: Int?
    var left: Int?
    var right: Int?
    var vertical: Int?
    var horizontal: Int?
  }
}

struct LiveActivityWidget: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: LiveActivityAttributes.self) { context in
      LiveActivityView(contentState: context.state, attributes: context.attributes)
        .activityBackgroundTint(SurevaColors.charcoal)
        .activitySystemActionForegroundColor(SurevaColors.brandOrange)
        .applyWidgetURL(from: context.attributes.deepLinkUrl)
    } dynamicIsland: { context in
      let level = ProtectionLevel(progress: context.state.progress)

      return DynamicIsland {
        // Top-left: Sureva brand mark + wordmark.
        DynamicIslandExpandedRegion(.leading, priority: 1) {
          expandedBrand()
            .applyWidgetURL(from: context.attributes.deepLinkUrl)
        }

        // Top-right: compact "Reapply" pill.
        DynamicIslandExpandedRegion(.trailing, priority: 1) {
          expandedReapplyPill()
            .applyWidgetURL(from: context.attributes.deepLinkUrl)
        }

        // Bottom: status word + giant countdown timer over a continuous
        // green->red protection wash, with the single "Reapply" action.
        DynamicIslandExpandedRegion(.bottom) {
          expandedStatusCard(
            title: context.state.title,
            endDate: context.state.timerEndDateInMilliseconds,
            level: level
          )
          .applyWidgetURL(from: context.attributes.deepLinkUrl)
        }
      } compactLeading: {
        // Simple U mark in a rounded square.
        SurevaMark(size: 20, cornerRadius: 6)
          .padding(.leading, 2)
          .applyWidgetURL(from: context.attributes.deepLinkUrl)
      } compactTrailing: {
        // Plain, glanceable time — colored by the live protection band.
        if let date = context.state.timerEndDateInMilliseconds {
          Text(timerInterval: Date.toTimerInterval(miliseconds: date), countsDown: true)
            .font(.system(size: 15, weight: .semibold, design: .rounded))
            .monospacedDigit()
            .minimumScaleFactor(0.8)
            .foregroundStyle(level.color)
            .frame(maxWidth: 52)
            .multilineTextAlignment(.trailing)
            .applyWidgetURL(from: context.attributes.deepLinkUrl)
        }
      } minimal: {
        // Tiny colored protection ring — the most critical glance.
        SurevaGauge(level: level, lineWidth: 3, showsPercent: false)
          .frame(width: 20, height: 20)
          .applyWidgetURL(from: context.attributes.deepLinkUrl)
      }
      .keylineTint(level.color)
    }
  }

  // MARK: - Expanded regions

  /// Top-left: brand mark + "Sureva" wordmark.
  private func expandedBrand() -> some View {
    HStack(spacing: 7) {
      SurevaMark(size: 22, cornerRadius: 7)
      Text("Sureva")
        .font(.system(size: 15, weight: .bold, design: .rounded))
        .foregroundStyle(.white.opacity(0.92))
    }
    .padding(.leading, 4)
    .padding(.top, 2)
  }

  /// Top-right: compact "Reapply" pill.
  private func expandedReapplyPill() -> some View {
    ReapplyButton()
      .padding(.trailing, 4)
      .padding(.top, 2)
  }

  /// Bottom: the dominant status card — live status word + giant monospaced
  /// countdown on the left, the "See details" pill on the right, over a
  /// continuous protection wash (green when protected, sliding to red).
  @ViewBuilder
  private func expandedStatusCard(
    title: String,
    endDate: Double?,
    level: ProtectionLevel
  ) -> some View {
    HStack(alignment: .center, spacing: 12) {
      VStack(alignment: .leading, spacing: 3) {
        // Status label above the timer — plain text, no dot accent.
        Text(level.statusWord)
          .font(.system(size: 13, weight: .bold, design: .rounded))
          .tracking(0.3)
          .foregroundStyle(.white.opacity(0.95))
          .lineLimit(1)
          .minimumScaleFactor(0.8)

        // Giant monospaced countdown (or session title as a fallback).
        if let endDate {
          Text(timerInterval: Date.toTimerInterval(miliseconds: endDate), countsDown: true)
            .font(.system(size: 36, weight: .bold, design: .monospaced))
            .monospacedDigit()
            .foregroundStyle(.white)
            .lineLimit(1)
            .minimumScaleFactor(0.5)
            .frame(maxWidth: .infinity, alignment: .leading)
        } else {
          Text(title)
            .font(.system(size: 20, weight: .bold, design: .rounded))
            .foregroundStyle(.white)
            .lineLimit(2)
            .minimumScaleFactor(0.7)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
      }

      SeeDetailsPill()
    }
    .padding(.horizontal, 16)
    .padding(.vertical, 13)
    .frame(maxWidth: .infinity)
    .background(SurevaGlassPanel(tint: level.color))
  }
}
