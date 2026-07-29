package com.example.swastik.data.repository

import android.content.Context
import com.example.swastik.data.model.Doctor
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class FavoriteDoctorsStore @Inject constructor(
    @ApplicationContext private val context: Context
) {
    private val prefs = context.getSharedPreferences("favorite_doctors_prefs", Context.MODE_PRIVATE)
    private val gson = Gson()
    
    private val _favorites = MutableStateFlow<Set<Doctor>>(loadFavorites())
    val favorites: StateFlow<Set<Doctor>> = _favorites.asStateFlow()

    private fun loadFavorites(): Set<Doctor> {
        val json = prefs.getString("fav_doctors_list", null) ?: return emptySet()
        val type = object : TypeToken<List<Doctor>>() {}.type
        return try {
            val list: List<Doctor> = gson.fromJson(json, type)
            list.toSet()
        } catch (e: Exception) {
            emptySet()
        }
    }

    private fun saveFavorites(favs: Set<Doctor>) {
        val json = gson.toJson(favs.toList())
        prefs.edit().putString("fav_doctors_list", json).apply()
    }

    fun toggleFavorite(doctor: Doctor) {
        val current = _favorites.value.toMutableSet()
        val existing = current.find { it.id == doctor.id }
        if (existing != null) {
            current.remove(existing)
        } else {
            current.add(doctor)
        }
        _favorites.value = current
        saveFavorites(current)
    }
}
