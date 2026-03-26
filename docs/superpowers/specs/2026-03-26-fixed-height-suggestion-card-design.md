# Fixed-Height Suggestion Card Design

**Date:** 2026-03-26
**Status:** Approved

## Problem

`SuggestionCard` grows and shrinks based on description text length, causing layout shifts when cards are swapped. CTAs are inside the card, contributing to height instability.

## Solution

Extract CTAs from `SuggestionCard` into `SuggestedActions`, giving the card a fixed height and the buttons a dedicated space below.

## Components

### `SuggestionCard` (display-only)

- **Remove props:** `onActivate`, `onSkip`, `isActivating`, `isSkipping`, `skipText`
- **Add:** fixed height wrapper (`h-72`)
- **Text clamping:** `numberOfLines={2}` on title, `numberOfLines={3}` on description, both with `ellipsizeMode="tail"`
- **Layout:** `flex-1` on content area to fill available vertical space

### `SuggestedActions` (owns interaction)

- Renders `SuggestionCard` (display only)
- Below the card: a dedicated `<View>` with `I'm on it` and skip `Button`s
- Button area is always the same height — total layout never shifts between cards
- Passes `categoryInfo.buttonColor` down or derives it locally for the activate button color

## What Doesn't Change

- `forYou` prop stays on `SuggestionCard`
- Category badge, icon, title, description — same content
- Button labels and callbacks — same logic, just moved to parent
