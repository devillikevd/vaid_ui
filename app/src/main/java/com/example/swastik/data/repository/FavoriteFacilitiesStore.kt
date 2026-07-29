package com.example.swastik.data.repository

import android.content.Context
import com.example.swastik.data.model.FacilityType
import com.example.swastik.data.model.MedicalFacility
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class FavoriteFacilitiesStore @Inject constructor(
    @ApplicationContext private val context: Context
) {
    private val prefs = context.getSharedPreferences("favorite_facilities_prefs", Context.MODE_PRIVATE)
    private val gson = Gson()
    
    private val _favorites = MutableStateFlow<Set<MedicalFacility>>(loadFavorites())
    val favorites: StateFlow<Set<MedicalFacility>> = _favorites.asStateFlow()

    private fun loadFavorites(): Set<MedicalFacility> {
        val json = prefs.getString("fav_facilities_list", null) ?: return emptySet()
        val type = object : TypeToken<List<MedicalFacility>>() {}.type
        return try {
            val list: List<MedicalFacility> = gson.fromJson(json, type)
            list.toSet()
        } catch (e: Exception) {
            emptySet()
        }
    }

    private fun saveFavorites(favs: Set<MedicalFacility>) {
        val json = gson.toJson(favs.toList())
        prefs.edit().putString("fav_facilities_list", json).apply()
    }

    fun toggleFavorite(facility: MedicalFacility) {
        val current = _favorites.value.toMutableSet()
        val existing = current.find { it.id == facility.id }
        if (existing != null) {
            current.remove(existing)
        } else {
            current.add(facility)
        }
        _favorites.value = current
        saveFavorites(current)
    }

    fun isFavorite(facilityId: String): Boolean {
        return _favorites.value.any { it.id == facilityId }
    }
}
