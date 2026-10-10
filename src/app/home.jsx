import { useRouter } from 'expo-router';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const COLORS = {
  green: '#176B52',
  greenLight: '#EAF5F1',
  greenBorder: '#CFE5DE',

  white: '#FFFFFF',
  background: '#F6F8F7',

  text: '#17211D',
  muted: '#6B7772',
  border: '#E1E7E4',
};

export default function Home() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >

        {/* =========================
            HEADER
        ========================== */}

        <View style={styles.header}>

          <View style={styles.brandRow}>

            <View style={styles.logo}>
              <Text style={styles.logoText}>
                M
              </Text>
            </View>

            <View>
              <Text style={styles.brandName}>
                MedTracker
              </Text>

              <Text style={styles.brandSubtitle}>
                Smart Pharmacy Management
              </Text>
            </View>

          </View>

          {/* LOGIN */}

          <TouchableOpacity
            style={styles.loginSmallButton}
            onPress={() => router.push('/login')}
            activeOpacity={0.8}
          >
            <Text style={styles.loginSmallText}>
              Login
            </Text>
          </TouchableOpacity>

        </View>


        {/* =========================
            HERO
        ========================== */}

        <View style={styles.heroCard}>

          <View style={styles.heroBadge}>

            <View style={styles.badgeDot} />

            <Text style={styles.heroBadgeText}>
              PHARMACY MANAGEMENT
            </Text>

          </View>


          <Text style={styles.heroTitle}>
            Manage your pharmacy
            <Text style={styles.heroTitleGreen}>
              {' '}smarter.
            </Text>
          </Text>


          <Text style={styles.heroDescription}>
            Track medicines, monitor expiry dates,
            manage inventory and make smarter
            reorder decisions — all in one place.
          </Text>


          <View style={styles.heroButtons}>

            {/* GET STARTED */}

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => router.push('/login')}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryButtonText}>
                Get Started
              </Text>

              <Text style={styles.primaryArrow}>
                →
              </Text>
            </TouchableOpacity>


            {/* CREATE ACCOUNT */}

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => router.push('/register')}
              activeOpacity={0.8}
            >
              <Text style={styles.secondaryButtonText}>
                Create Account
              </Text>
            </TouchableOpacity>

          </View>

        </View>


        {/* =========================
            QUICK STATS
        ========================== */}

        <View style={styles.statsCard}>

          <View style={styles.statItem}>

            <Text style={styles.statNumber}>
              24/7
            </Text>

            <Text style={styles.statLabel}>
              Inventory Access
            </Text>

          </View>


          <View style={styles.statDivider} />


          <View style={styles.statItem}>

            <Text style={styles.statNumber}>
              Smart
            </Text>

            <Text style={styles.statLabel}>
              Stock Tracking
            </Text>

          </View>


          <View style={styles.statDivider} />


          <View style={styles.statItem}>

            <Text style={styles.statNumber}>
              Secure
            </Text>

            <Text style={styles.statLabel}>
              Data Management
            </Text>

          </View>

        </View>


        {/* =========================
            FEATURES
        ========================== */}

        <View style={styles.sectionHeader}>

          <Text style={styles.sectionEyebrow}>
            EVERYTHING IN ONE PLACE
          </Text>

          <Text style={styles.sectionTitle}>
            Built for modern pharmacies
          </Text>

          <Text style={styles.sectionDescription}>
            Simple tools to help manage daily
            pharmacy operations efficiently.
          </Text>

        </View>


        <View style={styles.featuresGrid}>

          <FeatureCard
            number="01"
            title="Expiry Tracking"
            description="Monitor medicine expiry dates and identify critical stock before it becomes a problem."
          />

          <FeatureCard
            number="02"
            title="Inventory Management"
            description="Keep track of medicine quantities, batches, prices and current stock."
          />

          <FeatureCard
            number="03"
            title="OCR Scanning"
            description="Extract medicine details from package images and reduce manual data entry."
          />

          <FeatureCard
            number="04"
            title="Barcode & QR"
            description="Quickly identify medicines using barcode and QR-based workflows."
          />

          <FeatureCard
            number="05"
            title="Smart Reorder"
            description="Use stock and sales information to identify medicines that may need reordering."
          />

          <FeatureCard
            number="06"
            title="Alerts & Reports"
            description="Stay informed about expiry, low stock and pharmacy inventory activity."
          />

        </View>


        {/* =========================
            HOW IT WORKS
        ========================== */}

        <View style={styles.howSection}>

          <View style={styles.sectionHeader}>

            <Text style={styles.sectionEyebrow}>
              SIMPLE WORKFLOW
            </Text>

            <Text style={styles.sectionTitle}>
              How MedTracker works
            </Text>

          </View>


          <StepItem
            number="1"
            title="Add your medicines"
            description="Enter medicine details manually or use scanning features to speed up data entry."
          />

          <StepItem
            number="2"
            title="Track your inventory"
            description="Monitor quantities, batches, expiry dates and medicine status from your dashboard."
          />

          <StepItem
            number="3"
            title="Act on alerts"
            description="Review expiry and low-stock alerts and take action before stock becomes a problem."
          />

          <StepItem
            number="4"
            title="Make smarter decisions"
            description="Use reports and reorder suggestions to manage your pharmacy more efficiently."
            last
          />

        </View>


        {/* =========================
            CTA
        ========================== */}

        <View style={styles.ctaCard}>

          <View style={styles.ctaIcon}>

            <Text style={styles.ctaIconText}>
              M
            </Text>

          </View>


          <Text style={styles.ctaTitle}>
            Ready to manage your pharmacy smarter?
          </Text>


          <Text style={styles.ctaDescription}>
            Start using MedTracker to organize
            medicines, inventory and daily pharmacy
            operations.
          </Text>


          {/* CTA GET STARTED */}

          <TouchableOpacity
            style={styles.ctaButton}
            onPress={() => router.push('/login')}
            activeOpacity={0.85}
          >

            <Text style={styles.ctaButtonText}>
              Get Started
            </Text>

            <Text style={styles.ctaArrow}>
              →
            </Text>

          </TouchableOpacity>

        </View>


        {/* =========================
            FOOTER
        ========================== */}

        <View style={styles.footer}>

          <View style={styles.footerBrand}>

            <View style={styles.footerLogo}>

              <Text style={styles.footerLogoText}>
                M
              </Text>

            </View>

            <Text style={styles.footerName}>
              MedTracker
            </Text>

          </View>


          <Text style={styles.footerText}>
            Smart pharmacy management system
          </Text>


          <Text style={styles.footerCopyright}>
            © 2026 MedTracker. All rights reserved.
          </Text>

        </View>

      </ScrollView>
    </View>
  );
}


/* =========================================
   FEATURE CARD
========================================= */

function FeatureCard({
  number,
  title,
  description,
}) {
  return (
    <View style={styles.featureCard}>

      <View style={styles.featureTop}>

        <View style={styles.featureIcon}>

          <Text style={styles.featureNumber}>
            {number}
          </Text>

        </View>

        <View style={styles.featureLine} />

      </View>


      <Text style={styles.featureTitle}>
        {title}
      </Text>


      <Text style={styles.featureDescription}>
        {description}
      </Text>

    </View>
  );
}


/* =========================================
   STEP ITEM
========================================= */

function StepItem({
  number,
  title,
  description,
  last,
}) {
  return (
    <View style={styles.stepRow}>

      <View style={styles.stepNumberContainer}>

        <Text style={styles.stepNumber}>
          {number}
        </Text>

      </View>


      {!last && (
        <View style={styles.stepLine} />
      )}


      <View style={styles.stepContent}>

        <Text style={styles.stepTitle}>
          {title}
        </Text>

        <Text style={styles.stepDescription}>
          {description}
        </Text>

      </View>

    </View>
  );
}


/* =========================================
   STYLES
========================================= */

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  scrollContent: {
    paddingBottom: 30,
  },


  /* HEADER */

  header: {
    minHeight: 76,

    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 12,

    backgroundColor: COLORS.white,

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',

    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  logo: {
    width: 42,
    height: 42,

    borderRadius: 12,

    backgroundColor: COLORS.green,

    alignItems: 'center',
    justifyContent: 'center',

    marginRight: 10,
  },

  logoText: {
    color: COLORS.white,
    fontSize: 19,
    fontWeight: '900',
  },

  brandName: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.text,
  },

  brandSubtitle: {
    fontSize: 9,
    color: COLORS.muted,
    marginTop: 2,
  },

  loginSmallButton: {
    minWidth: 58,
    height: 34,

    paddingHorizontal: 12,

    borderRadius: 9,

    backgroundColor: COLORS.greenLight,

    borderWidth: 1,
    borderColor: COLORS.greenBorder,

    alignItems: 'center',
    justifyContent: 'center',
  },

  loginSmallText: {
    color: COLORS.green,
    fontSize: 12,
    fontWeight: '800',
  },


  /* HERO */

  heroCard: {
    margin: 16,

    borderRadius: 20,

    padding: 24,

    backgroundColor: COLORS.white,

    borderWidth: 1,
    borderColor: COLORS.greenBorder,

    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },

  heroBadge: {
    alignSelf: 'flex-start',

    flexDirection: 'row',
    alignItems: 'center',

    backgroundColor: COLORS.greenLight,

    borderRadius: 20,

    paddingHorizontal: 10,
    paddingVertical: 6,

    marginBottom: 16,
  },

  badgeDot: {
    width: 6,
    height: 6,

    borderRadius: 3,

    backgroundColor: COLORS.green,

    marginRight: 6,
  },

  heroBadgeText: {
    fontSize: 9,
    fontWeight: '800',

    color: COLORS.green,

    letterSpacing: 0.5,
  },

  heroTitle: {
    fontSize: 31,

    lineHeight: 39,

    fontWeight: '900',

    color: COLORS.text,

    marginBottom: 12,
  },

  heroTitleGreen: {
    color: COLORS.green,
  },

  heroDescription: {
    fontSize: 14,

    lineHeight: 22,

    color: COLORS.muted,

    marginBottom: 22,
  },

  heroButtons: {
    gap: 10,
  },

  primaryButton: {
    minHeight: 52,

    borderRadius: 11,

    backgroundColor: COLORS.green,

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  primaryButtonText: {
    color: COLORS.white,

    fontSize: 14,
    fontWeight: '800',
  },

  primaryArrow: {
    color: COLORS.white,

    fontSize: 20,
    fontWeight: '400',

    marginLeft: 9,
  },

  secondaryButton: {
    minHeight: 50,

    borderRadius: 11,

    backgroundColor: COLORS.greenLight,

    borderWidth: 1,
    borderColor: COLORS.greenBorder,

    alignItems: 'center',
    justifyContent: 'center',
  },

  secondaryButtonText: {
    color: COLORS.green,

    fontSize: 14,
    fontWeight: '700',
  },


  /* STATS */

  statsCard: {
    marginHorizontal: 16,
    marginBottom: 30,

    backgroundColor: COLORS.white,

    borderRadius: 14,

    borderWidth: 1,
    borderColor: COLORS.border,

    paddingVertical: 17,

    flexDirection: 'row',
    alignItems: 'center',
  },

  statItem: {
    flex: 1,

    alignItems: 'center',

    paddingHorizontal: 5,
  },

  statNumber: {
    fontSize: 15,

    fontWeight: '800',

    color: COLORS.green,

    marginBottom: 4,
  },

  statLabel: {
    fontSize: 9,

    color: COLORS.muted,

    textAlign: 'center',

    lineHeight: 13,
  },

  statDivider: {
    width: 1,
    height: 34,

    backgroundColor: COLORS.border,
  },


  /* SECTION */

  sectionHeader: {
    paddingHorizontal: 18,

    marginBottom: 16,
  },

  sectionEyebrow: {
    fontSize: 9,

    color: COLORS.green,

    fontWeight: '900',

    letterSpacing: 1,

    marginBottom: 6,
  },

  sectionTitle: {
    fontSize: 22,

    fontWeight: '900',

    color: COLORS.text,

    marginBottom: 7,
  },

  sectionDescription: {
    fontSize: 12,

    lineHeight: 19,

    color: COLORS.muted,
  },


  /* FEATURES */

  featuresGrid: {
    paddingHorizontal: 16,

    flexDirection: 'row',

    flexWrap: 'wrap',

    gap: 10,

    marginBottom: 34,
  },

  featureCard: {
    width: '48.4%',

    backgroundColor: COLORS.white,

    borderRadius: 14,

    padding: 15,

    minHeight: 174,

    borderWidth: 1,
    borderColor: COLORS.border,
  },

  featureTop: {
    flexDirection: 'row',
    alignItems: 'center',

    marginBottom: 14,
  },

  featureIcon: {
    width: 34,
    height: 34,

    borderRadius: 9,

    backgroundColor: COLORS.greenLight,

    alignItems: 'center',
    justifyContent: 'center',
  },

  featureNumber: {
    fontSize: 10,

    fontWeight: '900',

    color: COLORS.green,
  },

  featureLine: {
    flex: 1,

    height: 1,

    backgroundColor: COLORS.greenBorder,

    marginLeft: 8,
  },

  featureTitle: {
    fontSize: 14,

    fontWeight: '800',

    color: COLORS.text,

    marginBottom: 7,
  },

  featureDescription: {
    fontSize: 11,

    lineHeight: 17,

    color: COLORS.muted,
  },


  /* HOW IT WORKS */

  howSection: {
    marginBottom: 32,
  },

  stepRow: {
    minHeight: 92,

    marginHorizontal: 18,

    flexDirection: 'row',

    position: 'relative',
  },

  stepNumberContainer: {
    width: 36,
    height: 36,

    borderRadius: 18,

    backgroundColor: COLORS.green,

    alignItems: 'center',
    justifyContent: 'center',

    zIndex: 2,
  },

  stepNumber: {
    color: COLORS.white,

    fontSize: 13,

    fontWeight: '800',
  },

  stepLine: {
    position: 'absolute',

    left: 17,

    top: 36,

    width: 2,

    height: 58,

    backgroundColor: COLORS.greenBorder,
  },

  stepContent: {
    flex: 1,

    paddingLeft: 14,

    paddingBottom: 20,
  },

  stepTitle: {
    fontSize: 14,

    fontWeight: '800',

    color: COLORS.text,

    marginBottom: 5,
  },

  stepDescription: {
    fontSize: 11,

    lineHeight: 17,

    color: COLORS.muted,
  },


  /* CTA */

  ctaCard: {
    marginHorizontal: 16,
    marginBottom: 30,

    backgroundColor: COLORS.green,

    borderRadius: 20,

    padding: 24,

    alignItems: 'center',
  },

  ctaIcon: {
    width: 52,
    height: 52,

    borderRadius: 15,

    backgroundColor: 'rgba(255,255,255,0.15)',

    alignItems: 'center',
    justifyContent: 'center',

    marginBottom: 14,
  },

  ctaIconText: {
    color: COLORS.white,

    fontSize: 21,

    fontWeight: '900',
  },

  ctaTitle: {
    fontSize: 21,

    lineHeight: 28,

    fontWeight: '900',

    color: COLORS.white,

    textAlign: 'center',

    marginBottom: 9,
  },

  ctaDescription: {
    fontSize: 12,

    lineHeight: 19,

    color: '#DDEDE7',

    textAlign: 'center',

    marginBottom: 18,
  },

  ctaButton: {
    minHeight: 48,

    paddingHorizontal: 22,

    borderRadius: 10,

    backgroundColor: COLORS.white,

    flexDirection: 'row',

    alignItems: 'center',
    justifyContent: 'center',
  },

  ctaButtonText: {
    color: COLORS.green,

    fontSize: 13,

    fontWeight: '800',
  },

  ctaArrow: {
    color: COLORS.green,

    fontSize: 19,

    marginLeft: 8,
  },


  /* FOOTER */

  footer: {
    alignItems: 'center',

    paddingHorizontal: 20,

    paddingBottom: 10,
  },

  footerBrand: {
    flexDirection: 'row',
    alignItems: 'center',

    marginBottom: 8,
  },

  footerLogo: {
    width: 28,
    height: 28,

    borderRadius: 8,

    backgroundColor: COLORS.green,

    alignItems: 'center',
    justifyContent: 'center',

    marginRight: 7,
  },

  footerLogoText: {
    color: COLORS.white,

    fontSize: 12,

    fontWeight: '900',
  },

  footerName: {
    fontSize: 14,

    fontWeight: '800',

    color: COLORS.text,
  },

  footerText: {
    fontSize: 10,

    color: COLORS.muted,

    marginBottom: 5,
  },

  footerCopyright: {
    fontSize: 9,

    color: '#9AA59F',
  },

});