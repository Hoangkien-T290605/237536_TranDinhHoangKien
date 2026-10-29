
import { useCallback, useEffect, useState } from 'react'
import './App.css'

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000')
  .replace(/\/+$/, '')

const EMPTY_FORM = {
  foodId: '',
  name: '',
  category: '',
  cuisine: 'Việt Nam',
  ingredients: '',
  price: '',
  quantity: '',
  description: '',
  imageUrl: '',
}

const FALLBACK_IMAGE =
  'data:image/svg+xml;charset=UTF-8,' +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="160" height="120">
      <rect width="100%" height="100%" fill="#f0f3f8"/>
      <text x="50%" y="45%" text-anchor="middle" font-size="30">🍽️</text>
      <text x="50%" y="72%" text-anchor="middle" font-size="11" fill="#718096">Chưa có ảnh</text>
    </svg>
  `)

function FoodImage({ src, alt, className = '' }) {
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setFailed(false)
  }, [src])

  return (
    <img
      className={className}
      src={src?.trim() && !failed ? src.trim() : FALLBACK_IMAGE}
      alt={alt || 'Hình ảnh món ăn'}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  )
}

function formatPrice(value) {
  return `${Number(value || 0).toLocaleString('vi-VN')} đ`
}

async function readResponse(response) {
  const result = await response.json()

  if (!response.ok || result.success === false) {
    throw new Error(result.message || `Yêu cầu thất bại (${response.status}).`)
  }

  return result
}

function App() {
  const [foods, setFoods] = useState([])
  const [search, setSearch] = useState('')
  const [form, setForm] = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState(null)
  const [selectedFood, setSelectedFood] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState(null)

  const loadFoods = useCallback(async (keyword = '') => {
    setLoading(true)
    setError('')

    try {
      const params = new URLSearchParams()
      if (keyword.trim()) params.set('search', keyword.trim())

      const query = params.toString()
      const response = await fetch(
        `${API_URL}/api/foods${query ? `?${query}` : ''}`
      )
      const result = await readResponse(response)

      setFoods(Array.isArray(result.data) ? result.data : [])
    } catch (err) {
      setError(
        `${err.message || 'Không thể kết nối máy chủ.'} Hãy kiểm tra backend tại ${API_URL}.`
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadFoods()
  }, [loadFoods])

  function handleChange(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  function resetForm() {
    setForm(EMPTY_FORM)
    setEditingId(null)
  }

  function startEdit(food) {
    setForm({
      foodId: food.foodId || '',
      name: food.name || '',
      category: food.category || '',
      cuisine: food.cuisine || '',
      ingredients: Array.isArray(food.ingredients)
        ? food.ingredients.join(', ')
        : food.ingredients || '',
      price: String(food.price ?? ''),
      quantity: String(food.quantity ?? ''),
      description: food.description || '',
      imageUrl: food.imageUrl || '',
    })

    setEditingId(food.foodId)
    setNotice(null)
    setError('')

    document
      .getElementById('food-form')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (saving) return

    setSaving(true)
    setNotice(null)
    setError('')

    // Khi cập nhật, không gửi foodId để khớp với quy tắc của backend.
    // Khi thêm mới, foodId vẫn được gửi đầy đủ.
    const payload = {
      ...(editingId ? {} : { foodId: form.foodId.trim() }),
      name: form.name.trim(),
      category: form.category.trim(),
      cuisine: form.cuisine.trim(),
      ingredients: form.ingredients
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
      price: Number(form.price),
      quantity: Number(form.quantity),
      description: form.description.trim(),
      imageUrl: form.imageUrl.trim(),
    }

    try {
      const response = await fetch(
        editingId
          ? `${API_URL}/api/foods/${encodeURIComponent(editingId)}`
          : `${API_URL}/api/foods`,
        {
          method: editingId ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      )

      const result = await readResponse(response)

      const message =
        result.message ||
        (editingId
          ? 'Cập nhật món ăn thành công.'
          : 'Thêm món ăn thành công.')

      resetForm()
      setNotice({ type: 'success', message })

      await loadFoods(search)
    } catch (err) {
      setNotice({
        type: 'danger',
        message: err.message || 'Đã xảy ra lỗi khi lưu món ăn.',
      })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(food) {
    const confirmed = window.confirm(
      `Bạn có chắc muốn xóa món "${food.name}" (${food.foodId}) không?`
    )

    if (!confirmed) return

    setNotice(null)
    setError('')

    try {
      const response = await fetch(
        `${API_URL}/api/foods/${encodeURIComponent(food.foodId)}`,
        { method: 'DELETE' }
      )

      const result = await readResponse(response)

      if (editingId === food.foodId) resetForm()
      if (selectedFood?.foodId === food.foodId) setSelectedFood(null)

      setNotice({
        type: 'success',
        message: result.message || 'Xóa món ăn thành công.',
      })

      await loadFoods(search)
    } catch (err) {
      setNotice({
        type: 'danger',
        message: err.message || 'Đã xảy ra lỗi khi xóa món ăn.',
      })
    }
  }

  function handleSearch(event) {
    event.preventDefault()
    loadFoods(search)
  }

  function handleClearSearch() {
    setSearch('')
    loadFoods('')
  }

  return (
    <main className="app">
      <header className="topbar">
        <div className="brand-mark" aria-hidden="true">🍲</div>

        <div>
          <p className="eyebrow">HỆ THỐNG QUẢN LÝ</p>
          <h1>Quản lý món ăn</h1>
        </div>

        <div className="api-status">API: {API_URL}</div>
      </header>

      <section className="welcome">
        <div>
          <h2>Danh sách món ăn</h2>
          <p className="welcome-text">
            Quản lý thông tin, giá bán, số lượng và hình ảnh món ăn.
          </p>
        </div>

        <div className="food-count">
          <span>Tổng số món ăn</span>
          <strong>{foods.length}</strong>
        </div>
      </section>

      {error && (
        <div className="notice danger" role="alert">
          {error}
        </div>
      )}

      {notice && (
        <div
          className={`notice ${notice.type}`}
          role={notice.type === 'danger' ? 'alert' : 'status'}
        >
          {notice.message}
        </div>
      )}

      <section className="panel">
        <div className="section-heading">
          <div>
            <h2>Danh sách món ăn</h2>
            <p>Chọn tên món để xem chi tiết hoặc chỉnh sửa thông tin.</p>
          </div>

          <button
            type="button"
            className="button button-primary"
            onClick={() => {
              resetForm()
              setNotice(null)
              setError('')

              document
                .getElementById('food-form')
                ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }}
          >
            + Thêm món ăn
          </button>
        </div>

        <form className="search-bar" onSubmit={handleSearch}>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Tìm theo tên, mã món, danh mục..."
            aria-label="Tìm kiếm món ăn"
          />

          <button className="button button-dark" type="submit">
            Tìm kiếm
          </button>

          <button
            className="button button-light"
            type="button"
            onClick={handleClearSearch}
          >
            Xóa tìm kiếm
          </button>
        </form>

        {loading ? (
          <div className="empty-state">
            <div className="empty-icon">⏳</div>
            <h3>Đang tải dữ liệu...</h3>
            <p>Vui lòng chờ trong giây lát.</p>
          </div>
        ) : foods.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🍽️</div>
            <h3>Chưa có món ăn phù hợp</h3>
            <p>Thử từ khóa khác hoặc thêm món ăn mới.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Món ăn</th>
                  <th>Mã món</th>
                  <th>Danh mục</th>
                  <th>Giá bán</th>
                  <th>Số lượng</th>
                  <th>Thao tác</th>
                </tr>
              </thead>

              <tbody>
                {foods.map((food) => (
                  <tr key={food.foodId}>
                    <td>
                      <div className="food-cell">
                        <FoodImage
                          src={food.imageUrl}
                          alt={food.name}
                          className="food-thumbnail"
                        />

                        <div>
                          <button
                            type="button"
                            className="food-name"
                            onClick={() => setSelectedFood(food)}
                          >
                            {food.name}
                          </button>

                          <span className="food-cuisine">
                            {food.cuisine}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td>
                      <span className="food-id">{food.foodId}</span>
                    </td>

                    <td>{food.category}</td>
                    <td className="price">{formatPrice(food.price)}</td>

                    <td>
                      <span
                        className={`stock ${
                          Number(food.quantity) === 0 ? 'out' : ''
                        }`}
                      >
                        {food.quantity}
                      </span>
                    </td>

                    <td>
                      <div className="actions">
                        <button
                          type="button"
                          className="button button-light button-small"
                          onClick={() => setSelectedFood(food)}
                        >
                          Xem
                        </button>

                        <button
                          type="button"
                          className="button button-dark button-small"
                          onClick={() => startEdit(food)}
                        >
                          Sửa
                        </button>

                        <button
                          type="button"
                          className="button button-danger button-small"
                          onClick={() => handleDelete(food)}
                        >
                          Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="panel form-panel" id="food-form">
        <div className="section-heading">
          <div>
            <h2>{editingId ? 'Cập nhật món ăn' : 'Thêm món ăn mới'}</h2>

            <p>
              {editingId
                ? `Đang chỉnh sửa món ${editingId}.`
                : 'Nhập thông tin món ăn vào biểu mẫu bên dưới.'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <label>
              Mã món ăn *
              <input
                name="foodId"
                value={form.foodId}
                onChange={handleChange}
                placeholder="Ví dụ: F005"
                required
                disabled={Boolean(editingId)}
              />
            </label>

            <label>
              Tên món ăn *
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Nhập tên món ăn"
                required
              />
            </label>

            <label>
              Danh mục *
              <input
                name="category"
                value={form.category}
                onChange={handleChange}
                placeholder="Ví dụ: Món nước"
                required
              />
            </label>

            <label>
              Ẩm thực *
              <input
                name="cuisine"
                value={form.cuisine}
                onChange={handleChange}
                placeholder="Ví dụ: Việt Nam"
                required
              />
            </label>

            <label>
              Giá bán (VNĐ) *
              <input
                name="price"
                type="number"
                min="0"
                step="1"
                value={form.price}
                onChange={handleChange}
                placeholder="50000"
                required
              />
            </label>

            <label>
              Số lượng *
              <input
                name="quantity"
                type="number"
                min="0"
                step="1"
                value={form.quantity}
                onChange={handleChange}
                placeholder="30"
                required
              />
            </label>

            <label className="full-width">
              Nguyên liệu
              <input
                name="ingredients"
                value={form.ingredients}
                onChange={handleChange}
                placeholder="Thịt bò, bánh phở, hành..."
              />
            </label>

            <label className="full-width">
              Đường dẫn hình ảnh
              <input
                name="imageUrl"
                type="url"
                value={form.imageUrl}
                onChange={handleChange}
                placeholder="https://example.com/hinh-anh-mon-an.jpg"
              />

              <span className="field-help">
                Dán đường dẫn ảnh trực tiếp có thể mở được trên trình duyệt.
              </span>
            </label>

            {form.imageUrl.trim() && (
              <div className="image-preview-wrap full-width">
                <span className="preview-label">Xem trước hình ảnh</span>

                <FoodImage
                  src={form.imageUrl}
                  alt={form.name || 'Ảnh xem trước'}
                  className="form-image-preview"
                />
              </div>
            )}

            <label className="full-width">
              Mô tả
              <textarea
                name="description"
                rows="3"
                value={form.description}
                onChange={handleChange}
                placeholder="Mô tả về món ăn..."
              />
            </label>
          </div>

          <div className="form-footer">
            <p>* Là các trường bắt buộc.</p>

            <div className="actions">
              {editingId && (
                <button
                  type="button"
                  className="button button-light"
                  onClick={resetForm}
                  disabled={saving}
                >
                  Hủy sửa
                </button>
              )}

              <button
                type="button"
                className="button button-light"
                onClick={resetForm}
                disabled={saving}
              >
                Làm mới
              </button>

              <button
                type="submit"
                className="button button-primary"
                disabled={saving}
              >
                {saving
                  ? 'Đang lưu...'
                  : editingId
                    ? 'Lưu cập nhật'
                    : 'Thêm món ăn'}
              </button>
            </div>
          </div>
        </form>
      </section>

      <footer className="footer">
        <span>Hệ thống quản lý món ăn</span>
        <span>React · Express · MongoDB Atlas</span>
      </footer>

      {selectedFood && (
        <div
          className="modal-backdrop"
          onClick={() => setSelectedFood(null)}
        >
          <section
            className="detail-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="detail-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="modal-close"
              aria-label="Đóng"
              onClick={() => setSelectedFood(null)}
            >
              ×
            </button>

            <FoodImage
              src={selectedFood.imageUrl}
              alt={selectedFood.name}
              className="detail-image"
            />

            <h2 id="detail-title">{selectedFood.name}</h2>
            <p className="detail-id">Mã món: {selectedFood.foodId}</p>

            <dl className="detail-list">
              <dt>Danh mục</dt>
              <dd>{selectedFood.category}</dd>

              <dt>Ẩm thực</dt>
              <dd>{selectedFood.cuisine}</dd>

              <dt>Nguyên liệu</dt>
              <dd>
                {Array.isArray(selectedFood.ingredients)
                  ? selectedFood.ingredients.join(', ') || 'Chưa cập nhật'
                  : selectedFood.ingredients || 'Chưa cập nhật'}
              </dd>

              <dt>Giá bán</dt>
              <dd className="price">{formatPrice(selectedFood.price)}</dd>

              <dt>Số lượng</dt>
              <dd>{selectedFood.quantity}</dd>

              <dt>Mô tả</dt>
              <dd>{selectedFood.description || 'Chưa có mô tả.'}</dd>

              <dt>Đường dẫn ảnh</dt>
              <dd>
                {selectedFood.imageUrl ? (
                  <a
                    href={selectedFood.imageUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Mở hình ảnh
                  </a>
                ) : (
                  'Chưa có hình ảnh'
                )}
              </dd>
            </dl>

            <button
              type="button"
              className="button button-primary"
              onClick={() => {
                startEdit(selectedFood)
                setSelectedFood(null)
              }}
            >
              Sửa món ăn này
            </button>
          </section>
        </div>
      )}
    </main>
  )
}

export default App
