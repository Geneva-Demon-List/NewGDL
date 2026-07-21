import { store } from "../main.js";
import { embed } from "../util.js";
import { score } from "../score.js";
import { fetchEditors, fetchList } from "../content.js";
import Spinner from "../components/Spinner.js";
import LevelAuthors from "../components/List/LevelAuthors.js";

const roleIconMap = {
  owner: "crown",
  admin: "user-gear",
  helper: "user-shield",
  dev: "code",
  trial: "user-lock",
};

export default {
  components: { Spinner, LevelAuthors },
  data: () => ({
    list: [],
    editors: [],
    loading: true,
    selected: 0,
    errors: [],
    searchQuery: "",
    roleIconMap,
    store,
  }),
  computed: {
    filteredList() {
      if (!this.searchQuery) return this.list;
      return this.list.filter(([level, err]) => {
        if (!level || !level.name) return false;
        return level.name.toLowerCase().includes(this.searchQuery.toLowerCase());
      });
    },
    selectedLevel() {
      return this.filteredList[this.selected]
        ? this.filteredList[this.selected][0]
        : null;
    },
    // Compute the original rank (index) in the full list for display purposes.
    selectedIndexInFullList() {
      if (!this.selectedLevel) return this.selected + 1;
      return (
        this.list.findIndex(
          (item) => item[0] && item[0].id === this.selectedLevel.id
        ) + 1
      );
    },
  },
  watch: {
    // Reset the selected index when the search query changes.
    searchQuery() {
      this.selected = 0;
    },
  },
  methods: {
    embed,
    score,
    getOriginalRank(level) {
      let index = this.list.findIndex(
        (item) => item[0] && item[0].id === level.id
      );
      return index >= 0 ? index + 1 : this.selected + 1;
    },
  },
  async mounted() {
    this.list = await fetchList();
    this.editors = await fetchEditors();
    if (!this.list) {
      this.errors = [
        "Failed to load list. Retry in a few minutes or notify list staff.",
      ];
    } else {
      this.errors.push(
        ...this.list
          .filter(([_, err]) => err)
          .map(([_, err]) => `Failed to load level. (${err}.json)`)
      );
      if (!this.editors) {
        this.errors.push("Failed to load list editors.");
      }
    }
    this.loading = false;
  },
  template: `
    <main v-if="loading">
      <Spinner></Spinner>
    </main>
    <main v-else class="page-list">
      <div class="list-container">
        <!-- Search Bar -->
        <div class="search-bar">
          <input type="text" v-model="searchQuery" placeholder="Search levels..." />
        </div>
        <table class="list" v-if="filteredList.length">
          <tr v-for="(item, i) in filteredList" :key="i">
            <td class="rank">
              <p v-if="getOriginalRank(item[0]) <= 9999" class="type-label-lg">
                #{{ getOriginalRank(item[0]) }}
              </p>
              <p v-else class="type-label-lg">Legacy</p>
            </td>
            <td class="level" :class="{ 'active': selected === i, 'error': !item[0] }">
              <button @click="selected = i">
                <span class="type-label-lg">
                  {{ item[0]?.name || \`Error (\${item[1]}.json)\` }}
                </span>
              </button>
            </td>
          </tr>
        </table>
        <p v-if="filteredList.length === 0">No levels match your search.</p>
      </div>
      <div class="level-container" v-if="selectedLevel">
        <div class="level">
          <h1>{{ selectedLevel.name }}</h1>
          <LevelAuthors :author="selectedLevel.author" :creators="selectedLevel.creators" :verifier="selectedLevel.verifier"></LevelAuthors>
          <iframe class="video" id="videoframe" :src="embed(selectedLevel.showcase || selectedLevel.verification)" frameborder="0"></iframe>
          <ul class="stats">
            <li>
              <div class="type-title-sm">Points when getting 100%</div>
              <p>
                {{
                  score(getOriginalRank(selectedLevel), 100, selectedLevel.percentToQualify)
                }}
              </p>
            </li>
            <li v-if="selectedLevel.percentToQualify < 100 && getOriginalRank(selectedLevel) <= 75">
              <div class="type-title-sm">Points when getting {{ selectedLevel.percentToQualify }}%</div>
              <p>
                {{
                  score(getOriginalRank(selectedLevel), selectedLevel.percentToQualify, selectedLevel.percentToQualify)
                }}
              </p>
            </li>
            <li>
              <div class="type-title-sm">ID</div>
              <p>{{ selectedLevel.id }}</p>
            </li>
          </ul>
          <h2>Records</h2>
          <p v-if="selectedIndexInFullList <= 75">
            <strong>{{ selectedLevel.percentToQualify }}%</strong> to qualify
          </p>
          <p v-else-if="selectedIndexInFullList <= 9999">
            <strong>100%</strong> to qualify
          </p>
          <p v-else>This level does not accept new records.</p>
          <table class="records">
            <tr v-for="record in selectedLevel.records" class="record">
              <td class="percent">
                <p>{{ record.percent }}%</p>
              </td>
              <td class="user">
                <a :href="record.link" target="_blank" class="type-label-lg">{{ record.user }}</a>
              </td>
              <td class="mobile">
                <img v-if="record.mobile" :src="\`/assets/phone-landscape\${store.dark ? '-dark' : ''}.svg\`" alt="Mobile">
              </td>
              <td>
                <p>{{ record.hz }}</p>
              </td>
            </tr>
          </table>
        </div>
      </div>
      <div v-else class="level" style="height: 100%; justify-content: center; align-items: center;">
        
      </div>
      <div class="meta-container">
        <div class="meta">
          <div class="errors" v-show="errors.length > 0">
            <p class="error" v-for="error of errors">{{ error }}</p>
          </div>
          <div class="og">
            <p class="type-label-md">
              Website layout made by
              <a href="https://tsl.pages.dev/" target="_blank">TheShittyList</a>
            </p>
            <br>
            <p class="type-label-md">
              Website search bar and packs made by
              <a href="https://consistencychallenge.pages.dev/#/" target="_blank">CCL</a>
            </p>
          </div>
          <template v-if="editors">
            <h3>List Editors</h3>
            <ol class="editors">
              <li v-for="editor in editors" :key="editor.name">
                <img :src="\`/assets/\${roleIconMap[editor.role]}\${store.dark ? '-dark' : ''}.svg\`" :alt="editor.role">
                <a v-if="editor.link" class="type-label-lg link" target="_blank" :href="editor.link">{{ editor.name }}</a>
                <p v-else>{{ editor.name }}</p>
              </li>
            </ol>
          </template>
        <h3>Also check out the Glorpulon Challengelist by <a href="https://gdlchallenge.pages.dev">CLICKING HERE</a>!</h3>
                    <h3>The list of GDL Top Records are <a href="https://gdltop1.pages.dev">FOUND HERE</a>!</h3>
                    <h3>Submission Requirements</h3>
                    <p>
                        Submission MUST be done by somebody is has been approved to be on the GDL. To be approved, please submit this form. https://forms.gle/UmTFCUXyCYnoF9Yb6
                    </p>
                    <p>
                        Achieved the record without using hacks (however, FPS bypass is allowed). When using mod menus ( Mega Hack, Eclipse, etc ), the Cheat Indicator must be on.
                    </p>
                    <p>
                        Achieved the record on the level that is listed on the site - please check the level ID before you submit a record. If it is a level new to the site, this rule is invalidated.
                    </p>
                    <p>
                        Have audible click sounds ( no clickbot allowed ) OR a handcam throughout the video only IF it is an Insane Demon or Extreme Demon. If it is unrated, it has to be higher than the easiest Rated Insane Demon on the list.
                    </p>
                    <p>
                        About Clickbotting levels, they are considered extremely suspicious on this list. If you clickbot one or two easy demons for example, it will usually not be considered a rulebreak. Doing it often, however, can lead into a purge of your submissions or even a possible ban.
                    </p>
                    <p>
                        The recording must have a previous attempt and entire death animation shown before the completion, unless the completion is on the first attempt.
                    </p>
                    <p>
                        If the level is a verification, a level new to the list, the entire attempt must be recorded. This applies to all levels.
                    </p>
                    <p>
                        For all levels, recorded evidence must be provided. No sending screenshots because they do not provide enough evidence for it to be legit.
                    </p>
                    <p>
                        The recording must also show the player hit the endwall, or the completion will be invalidated.
                    </p>
                    <p>
                        Do not use secret routes or bug routes
                    </p>
                    <p>
                        Do not use easy modes, only a record of the unmodified level qualifies
                    </p>
                    <p>
                        All levels on this list must be published and publicly available for anybody with the full version to play.
                    </p>
                    <p>
                        All submissions on the Main list on levels less than 30 seconds long must go to the challenge list. You can check this by seeing the level page, and if it is described as "Short" or "Tiny", it belongs on the Challenge List.
                    </p>
                    <p>
                        All submissions must be done on a level already on the list, or if it is a GDL Verification, the level must either be rated, be decorated to some extent, or have historial significance.
                    </p>
                    <p>
                        Non-Demon levels are not allowed on this list, the minimum are Easy Demon difficulty levels.
                    </p>
                    <p>
                        If you use Mega Hack, you must set your ruleset to Demonlist. This also means that if the GD Demonlist does not allow a hack to be turned on, the GDL doesn't either.
                    </p>
                    <p>
                        If one were to beat a level on this list on their own personal copy ( StartPos copy, for example ), they must upload it and have it reviewed by the mods. The personal copy should not make the level any easier or harder to play, this involves, nerfs, buffs, or changing the decoration. ( No layouts! )
                    </p>
        </div>
      </div>
    </main>
  `,
};
