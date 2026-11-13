"use client";

import { motion } from 'framer-motion';
import { Shield, Zap, Layout, Users, Mic, Upload, Palette, Code, MessageSquare, Headphones } from 'lucide-react';
import Link from 'next/link';
import styles from './page.module.css';

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7 }
};

export default function Home() {
  return (
    <main>
      {/* Navbar */}
      <nav className={styles.navbar}>
        <div className={styles.navInner}>
          <Link href="/" className={styles.logo} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/logo.png" alt="Arise Logo" style={{ width: 36, height: 36, objectFit: 'contain' }} />
            <span className="text-gradient">Arise</span>
          </Link>
          <div className={styles.navLinks}>
            <Link href="/download">Download</Link>
            <Link href="/app">Open App</Link>
            <Link href="/register" className="btn-primary" style={{ padding: '8px 20px', fontSize: '0.9rem' }}>
              Sign Up
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className={styles.hero}>
        <motion.div className={styles.heroCard} {...fadeUp}>
          <h1 className={styles.tagline}>
            Find your <span className="text-gradient">community.</span>
          </h1>
          <p className={styles.subtagline}>
            Arise is the open-source chat app for friends and communities that works 
            the way you always wished it would. No ads. No paywalls. Just pure communication.
          </p>
          <div className={styles.cta}>
            <Link href="/download" className="btn-primary" style={{ padding: '16px 36px', fontSize: '1.1rem' }}>
              Download
            </Link>
            <Link href="/app" className="btn-secondary" style={{ padding: '16px 36px', fontSize: '1.1rem' }}>
              Open Web App
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Reasons Grid - "The better chat app" */}
      <section className={styles.reasons}>
        <h2 className={styles.sectionTitle}>The better chat app.</h2>
        <div className={styles.reasonsGrid}>
          <motion.div className={styles.reasonTile} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h3>Everything you need…</h3>
            <p>Servers, channels, voice chat, video calls, file sharing, markdown, reactions, threads, and everything else you expect from a modern chat platform.</p>
          </motion.div>
          <motion.div className={styles.reasonTile} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.05 }}>
            <h3>…and nothing you don&apos;t.</h3>
            <p>No ads, no data mining, no shady partnerships. We don&apos;t sell your data, track your activity, or interrupt you with promotions. Ever.</p>
          </motion.div>
          <motion.div className={styles.reasonTile} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}>
            <h3>Handles tens, handles thousands.</h3>
            <p>Whether you&apos;re chatting with a handful of friends or running a massive community, Arise scales with you seamlessly.</p>
          </motion.div>
          <motion.div className={styles.reasonTile} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.15 }}>
            <h3>The rules are simple.</h3>
            <p>Manage your community with intuitive role-based permissions, powerful moderation tools, and the best moderation bots in class.</p>
          </motion.div>
          <motion.div className={styles.reasonTile} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }}>
            <h3>Not sketchy, not creepy.</h3>
            <p>The code is public and the privacy policy is short enough to actually read. Your data stays yours.</p>
          </motion.div>
          <motion.div className={styles.reasonTile} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.25 }}>
            <h3>Take it with you. Everywhere.</h3>
            <p>Your account, conversations, and settings sync across Windows, macOS, Linux, Android, iOS, and the web.</p>
          </motion.div>
          <motion.div className={styles.reasonTile} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.3 }}>
            <h3>Answers to you, not investors.</h3>
            <p>No board to please and no ad revenue to protect. Every decision starts and ends with the people using the software. Free and open source, forever.</p>
          </motion.div>
          <motion.div className={styles.reasonTile} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.35 }}>
            <h3>You&apos;re in control. Really.</h3>
            <p>Self-host if you want, or use our servers. It&apos;s free, it&apos;s open, and it&apos;s yours to do with as you please.</p>
          </motion.div>
        </div>
      </section>

      {/* Added Value - Feature details */}
      <section className={styles.addedValue}>
        <h2 className={styles.sectionTitle}>Still not convinced?</h2>
        <div className={styles.addedValueItems}>
          <div className={styles.addedValueItem}>
            <div className={styles.addedValueText}>
              <div className={styles.addedValueIcon}><Zap size={24} /></div>
              <h3>Don&apos;t pay for basic stuff.</h3>
              <p>Custom emojis, large file uploads, server-specific profile pictures, animated avatars, and profile banners — all free. No subscription walls, no Nitro-style upsells.</p>
            </div>
            <div className={styles.addedValueImage}>Free features preview</div>
          </div>

          <div className={`${styles.addedValueItem} ${styles.reverse}`}>
            <div className={styles.addedValueText}>
              <div className={styles.addedValueIcon}><Palette size={24} /></div>
              <h3>Theming won&apos;t get you banned.</h3>
              <p>Arise ships with beautiful themes out of the box. Don&apos;t like them? Make your own or use custom CSS. Personalization is a feature, not an exploit.</p>
            </div>
            <div className={styles.addedValueImage}>Theming preview</div>
          </div>

          <div className={styles.addedValueItem}>
            <div className={styles.addedValueText}>
              <div className={styles.addedValueIcon}><Users size={24} /></div>
              <h3>Group DMs that scale.</h3>
              <p>Group DMs support up to 50 members, perfect for project collaboration, gaming squads, or ad-hoc voice groups. Bots work in them too.</p>
            </div>
            <div className={styles.addedValueImage}>Group DM preview</div>
          </div>

          <div className={`${styles.addedValueItem} ${styles.reverse}`}>
            <div className={styles.addedValueText}>
              <div className={styles.addedValueIcon}><Code size={24} /></div>
              <h3>Developers love it.</h3>
              <p>Our public API is so powerful that we use it ourselves for the official apps. Build bots, custom clients, or integrations with full documentation.</p>
            </div>
            <div className={styles.addedValueImage}>API preview</div>
          </div>

          <div className={styles.addedValueItem}>
            <div className={styles.addedValueText}>
              <div className={styles.addedValueIcon}><Headphones size={24} /></div>
              <h3>Crystal clear voice &amp; video.</h3>
              <p>Free voice channels with no user limits, screen sharing, and video calls. No quality throttling, no time limits. Talk as long as you want.</p>
            </div>
            <div className={styles.addedValueImage}>Voice chat preview</div>
          </div>

          <div className={`${styles.addedValueItem} ${styles.reverse}`}>
            <div className={styles.addedValueText}>
              <div className={styles.addedValueIcon}><MessageSquare size={24} /></div>
              <h3>We actually listen.</h3>
              <p>Open issue tracker, active community server, and developers who care. Request features, report bugs, or just say hi. We&apos;re always listening.</p>
            </div>
            <div className={styles.addedValueImage}>Community preview</div>
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className={styles.closing}>
        <h2 className={styles.sectionTitle}>Ready to make the switch?</h2>
        <div className={styles.cta}>
          <Link href="/download" className="btn-primary" style={{ padding: '16px 36px', fontSize: '1.1rem' }}>
            Download
          </Link>
          <Link href="/app" className="btn-secondary" style={{ padding: '16px 36px', fontSize: '1.1rem' }}>
            Open Web App
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerGrid}>
          <div className={styles.footerBrand}>
            <div className={styles.footerLogo}><span className="text-gradient">Arise</span></div>
            <p>The open-source chat platform for communities that care.</p>
          </div>
          <div className={styles.footerCol}>
            <h4>Arise App</h4>
            <Link href="/download">Download for Desktop</Link>
            <Link href="/download">Download for Android</Link>
            <Link href="/download">Download for iOS</Link>
            <Link href="/app">Open Web App</Link>
          </div>
          <div className={styles.footerCol}>
            <h4>Developers</h4>
            <a href="#">Source Code</a>
            <a href="#">Documentation</a>
            <a href="#">API Reference</a>
          </div>
          <div className={styles.footerCol}>
            <h4>Company</h4>
            <a href="#">About</a>
            <a href="#">Blog</a>
            <a href="#">Brand Assets</a>
            <a href="#">Contact</a>
          </div>
          <div className={styles.footerCol}>
            <h4>Legal</h4>
            <a href="#">Terms of Service</a>
            <a href="#">Privacy Policy</a>
            <a href="#">Community Guidelines</a>
          </div>
        </div>
        <div className={styles.footerBottom}>
          © {new Date().getFullYear()} Arise. Free and open source, now and forever.
        </div>
      </footer>
    </main>
  );
}
