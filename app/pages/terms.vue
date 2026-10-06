<template>
  <div class="doc">
    <header class="page-header">
      <h1 class="page-title">{{ t('nav.terms') }}</h1>
    </header>

    <article v-if="locale === 'ko-KR'" class="doc-body card">
      <p>본 이용약관은 <strong>modlist.org</strong>(이하 '서비스')에서 제공하는 모드 공유 및 커뮤니티 서비스를 이용하는 회원 간의 권리와 의무를 규정합니다.</p>
      
      <h2>1. 서비스의 목적</h2>
      <p>서비스는 다양한 게임의 모드(Mods)를 탐색, 공유, 관리할 수 있도록 지원하는 오픈소스 비영리 아카이브 플랫폼입니다.</p>

      <h2>2. 회원 의무 및 저작권</h2>
      <ul>
        <li>제출하는 모든 모드 파일 및 정보는 타인의 저작권을 침해하지 않아야 합니다.</li>
        <li>본인이 제작하지 않았거나 공유 권한을 부여받지 않은 모드를 승인 없이 제출하는 것은 금지됩니다.</li>
        <li>사용자를 기만하거나 시스템을 훼손할 수 있는 멀웨어, 악성 스크립트, 바이러스 등이 포함된 악성 파일의 제출을 엄격히 금지합니다.</li>
      </ul>

      <h2>3. 관리자 권한 및 검토 절차</h2>
      <p>서비스의 관리자는 커뮤니티의 안전과 정돈을 위해 다음과 같은 조치를 행사할 수 있습니다.</p>
      <ul>
        <li>제출된 모드나 버전에 저작권 침해, 악성 파일, 가이드라인 위반 요소가 발견될 경우 승인 거부 또는 사전 고지 없는 삭제 조치</li>
        <li>반복적인 가이드라인 위반 유저에 대한 계정 제재 및 권한 차단</li>
      </ul>

      <h2>4. 면책 사항</h2>
      <p>서비스는 공유되는 모드 파일들의 신뢰성, 안전성을 보증하지 않으며, 사용자가 모드를 설치하고 사용하는 과정에서 발생하는 모든 하드웨어/소프트웨어적 피해에 대하여 어떠한 책무도 지지 않습니다.</p>
    </article>

    <article v-else class="doc-body card">
      <p>These Terms of Service govern your use of the mod sharing and community platform <strong>modlist.org</strong> (referred to as "the Service").</p>
      
      <h2>1. Purpose of the Service</h2>
      <p>The Service is an open-source, non-profit archival and distribution platform designed to help users explore, share, and manage game modifications (Mods).</p>

      <h2>2. User Content and Copyright Guidelines</h2>
      <ul>
        <li>All mod files and metadata submitted must respect intellectual property rights.</li>
        <li>Submitting mods that you did not create or lack the permission to distribute is strictly prohibited.</li>
        <li>Submitting malicious software, malware, ransomware, spyware, or scripts containing destructive code is strictly forbidden and will result in permanent suspension.</li>
      </ul>

      <h2>3. Moderation and Administration Rights</h2>
      <p>To ensure a safe environment, administrators of the Service reserve the right to:</p>
      <ul>
        <li>Reject, unapprove, or delete any mod submission or version update found in violation of copyright, safety, or community guidelines without prior notice.</li>
        <li>Suspend accounts or restrict publishing privileges for users who repeatedly violate these terms.</li>
      </ul>

      <h2>4. Disclaimers and Limitation of Liability</h2>
      <p>The Service does not guarantee the safety, stability, or compatibility of shared mod files. The Service shall not be held liable for any damages to hardware, operating systems, or game client data resulting from downloading or using third-party files retrieved through this platform.</p>
    </article>
  </div>
</template>

<script setup lang="ts">
import { useI18n, useSeoMeta } from '#imports'

const { t, locale } = useI18n()

useSeoMeta({
  title: () => `${t('nav.terms')} - modlist.org`,
  ogTitle: () => `${t('nav.terms')} - modlist.org`,
  robots: 'noindex, follow'
})
</script>

<style scoped>
.doc {
  width: 100%;
  max-width: 760px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.doc-body {
  padding: 32px;
  color: var(--text-secondary);
  font-size: 15px;
  line-height: 1.75;
}

.doc-body > :first-child {
  margin-top: 0;
}

.doc-body > :last-child {
  margin-bottom: 0;
}

.doc-body strong {
  color: var(--text);
  font-weight: 700;
}

.card.doc-body h2 {
  margin: 32px 0 10px;
  padding-top: 24px;
  border-top: 1px solid var(--border);
  color: var(--text);
  font-size: 17px;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.doc-body p {
  margin: 0 0 14px;
}

.doc-body ul {
  margin: 0 0 14px;
  padding-left: 22px;
  list-style: disc;
}

.doc-body li {
  margin-bottom: 6px;
  padding-left: 2px;
}

.doc-body li::marker {
  color: var(--text-tertiary);
}

@media (max-width: 640px) {
  .doc-body {
    padding: 20px;
  }
}
</style>
